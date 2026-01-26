import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isWorkingDay } from '@/lib/attendance/holiday-checker'
import { notifyCheckinReminder, notifyIndividualCheckinReminder } from '@/lib/notifications/attendance-alert-notifications'

/**
 * POST /api/attendance/alerts/checkin-reminder
 * 出勤忘れ通知を生成（定期実行用）
 * 設定時刻（デフォルト10:00）に未出勤のスタッフに通知
 * MVP版: 営業日・祝日判定に対応
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Cron認証（本番環境ではVercel Cron Secretなどで保護）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 日本時間で今日の日付を取得
    const now = new Date()
    const jstOffset = 9 * 60 // 日本は UTC+9
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    console.log(`[出勤リマインダー] 処理開始: ${today}`)

    // 出勤リマインダーが有効な組織を取得（MVP: 営業日設定も取得）
    const { data: organizations, error: orgError } = await supabase
      .from('organization_attendance_settings')
      .select(`
        organization_id,
        checkin_reminder_enabled,
        checkin_reminder_time,
        working_days,
        exclude_holidays,
        default_checkin_time,
        default_alert_time,
        organizations (
          id,
          name
        )
      `)
      .eq('checkin_reminder_enabled', true)

    if (orgError || !organizations || organizations.length === 0) {
      console.log('[出勤リマインダー] 有効な組織なし')
      return NextResponse.json({
        success: true,
        message: '出勤リマインダーが有効な組織がありません',
        processed: 0,
      })
    }

    let totalAlerts = 0
    let skippedOrgs = 0

    // 各組織ごとに処理
    for (const org of organizations) {
      const organizationId = org.organization_id

      // MVP: 営業日判定
      const workingDays = org.working_days || {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: false,
        sun: false
      }
      const excludeHolidays = org.exclude_holidays ?? true

      const isBusinessDay = await isWorkingDay(today, workingDays, excludeHolidays)

      if (!isBusinessDay) {
        console.log(`[出勤リマインダー] 組織 ${organizationId}: 本日は休日のためスキップ`)
        skippedOrgs++
        continue
      }

      console.log(`[出勤リマインダー] 組織 ${organizationId}: 営業日として処理開始`)

      // その組織の全スタッフを取得（削除されていない）
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      if (usersError || !users || users.length === 0) {
        console.log(`[出勤リマインダー] 組織 ${organizationId}: スタッフなし`)
        continue
      }

      // 今日の出勤記録を取得
      const { data: todayRecords, error: recordsError } = await supabase
        .from('attendance_records')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('date', today)

      if (recordsError) {
        console.error(`組織 ${organizationId} の出勤記録取得エラー:`, recordsError)
        continue
      }

      // 出勤済みユーザーIDのSet
      const checkedInUserIds = new Set(todayRecords?.map((r) => r.user_id) || [])

      // 未出勤のユーザーを抽出
      const missingUsers = users.filter((user) => !checkedInUserIds.has(user.id))

      if (missingUsers.length === 0) {
        console.log(`[出勤リマインダー] 組織 ${organizationId}: 全員出勤済み`)
        continue
      }

      // アラート作成
      const alerts = missingUsers.map((user) => ({
        organization_id: organizationId,
        target_user_id: user.id,
        alert_type: 'checkin_reminder',
        target_date: today,
        title: '出勤打刻忘れ',
        message: `${user.name}さん、まだ出勤打刻がされていません。打刻をお願いします。`,
        metadata: {
          user_name: user.name,
          user_email: user.email,
          reminder_time: org.checkin_reminder_time,
        },
      }))

      const { error: insertError } = await supabase.from('attendance_alerts').insert(alerts)

      if (insertError) {
        console.error(`[出勤リマインダー] 組織 ${organizationId} のアラート挿入エラー:`, insertError)
        continue
      }

      console.log(`[出勤リマインダー] 組織 ${organizationId}: ${alerts.length}件のアラートを生成`)
      totalAlerts += alerts.length

      // 通知を送信
      try {
        // 管理者/マネージャーにサマリー通知
        await notifyCheckinReminder({
          organizationId,
          targetDate: today,
          missingUsers: missingUsers.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email
          }))
        })

        // 個別スタッフにも通知（オプション: 必要に応じてコメントアウト可能）
        for (const user of missingUsers) {
          await notifyIndividualCheckinReminder({
            organizationId,
            userId: user.id,
            userName: user.name,
            targetDate: today
          })
        }

        console.log(`[出勤リマインダー] 組織 ${organizationId}: 通知送信完了`)
      } catch (notifyError) {
        console.error(`[出勤リマインダー] 組織 ${organizationId} の通知送信エラー:`, notifyError)
        // 通知エラーがあってもアラート生成は成功しているので続行
      }
    }

    console.log(`[出勤リマインダー] 処理完了: ${totalAlerts}件生成, ${skippedOrgs}組織スキップ`)

    return NextResponse.json({
      success: true,
      message: `出勤リマインダー処理完了: ${totalAlerts}件のアラートを生成しました`,
      processed: totalAlerts,
      skipped_organizations: skippedOrgs,
      date: today,
    })
  } catch (error) {
    console.error('[出勤リマインダー] 処理エラー:', error)
    return NextResponse.json(
      { error: '出勤リマインダーの処理に失敗しました' },
      { status: 500 }
    )
  }
}
