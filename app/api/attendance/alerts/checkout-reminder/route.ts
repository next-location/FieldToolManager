import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isWorkingDay } from '@/lib/attendance/holiday-checker'
import { notifyCheckoutReminder, notifyIndividualCheckoutReminder } from '@/lib/notifications/attendance-alert-notifications'

/**
 * GET /api/attendance/alerts/checkout-reminder
 * 退勤忘れ通知を生成（定期実行用）
 * Phase 2: 勤務パターンごとの時刻に対応
 * 時間単位で実行し、該当する勤務パターンのアラート時刻に到達したスタッフのみ処理
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Cron認証（本番環境ではVercel Cron Secretなどで保護）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 日本時間で今日の日付と現在時刻を取得
    const now = new Date()
    const jstOffset = 9 * 60 // 日本は UTC+9
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0] // YYYY-MM-DD
    const currentHour = jstDate.getHours() // 0-23
    const currentMinute = jstDate.getMinutes() // 0-59

    console.log(`[退勤リマインダー] 処理開始: ${today} ${currentHour}:${currentMinute}`)

    // 退勤リマインダーが有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organization_attendance_settings')
      .select(`
        organization_id,
        checkout_reminder_enabled,
        working_days,
        exclude_holidays,
        organizations (
          id,
          name
        )
      `)
      .eq('checkout_reminder_enabled', true)

    if (orgError || !organizations || organizations.length === 0) {
      console.log('[退勤リマインダー] 有効な組織なし')
      return NextResponse.json({
        success: true,
        message: '退勤リマインダーが有効な組織がありません',
        processed: 0,
      })
    }

    let totalAlerts = 0
    let skippedOrgs = 0

    // 各組織ごとに処理
    for (const org of organizations) {
      const organizationId = org.organization_id

      // 営業日判定
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
        console.log(`[退勤リマインダー] 組織 ${organizationId}: 本日は休日のためスキップ`)
        skippedOrgs++
        continue
      }

      console.log(`[退勤リマインダー] 組織 ${organizationId}: 営業日として処理開始`)

      // その組織の勤務パターン一覧を取得
      const { data: workPatterns, error: patternsError } = await supabase
        .from('work_patterns')
        .select('id, name, expected_checkout_time, checkout_alert_enabled, checkout_alert_hours_after')
        .eq('organization_id', organizationId)

      if (patternsError || !workPatterns || workPatterns.length === 0) {
        console.log(`[退勤リマインダー] 組織 ${organizationId}: 勤務パターンなし`)
        continue
      }

      // 現在時刻にアラートすべきパターンをフィルタリング
      const targetPatterns = workPatterns.filter((pattern) => {
        if (!pattern.checkout_alert_enabled || !pattern.expected_checkout_time) return false

        // expected_checkout_time (HH:MM:SS) をパース
        const [hours, minutes] = pattern.expected_checkout_time.split(':').map(Number)

        // アラート時刻 = 退勤予定時刻 + checkout_alert_hours_after
        const alertHours = hours + Math.floor(pattern.checkout_alert_hours_after)
        const alertMinutes = minutes + (pattern.checkout_alert_hours_after % 1) * 60

        // 正規化
        const finalAlertHours = alertHours + Math.floor(alertMinutes / 60)
        const finalAlertMinutes = Math.floor(alertMinutes % 60)

        // 現在時刻がアラート時刻と一致するか（±30分の範囲）
        const hourMatch = currentHour === finalAlertHours
        const minuteMatch = Math.abs(currentMinute - finalAlertMinutes) <= 30

        return hourMatch && minuteMatch
      })

      if (targetPatterns.length === 0) {
        console.log(`[退勤リマインダー] 組織 ${organizationId}: 現在時刻に該当する勤務パターンなし`)
        continue
      }

      const targetPatternIds = targetPatterns.map((p) => p.id)
      console.log(`[退勤リマインダー] 組織 ${organizationId}: 対象パターン ${targetPatternIds.length}件`)

      // 対象パターンを持つスタッフを取得
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email, role, work_pattern_id')
        .eq('organization_id', organizationId)
        .in('work_pattern_id', targetPatternIds)
        .is('deleted_at', null)

      if (usersError || !users || users.length === 0) {
        console.log(`[退勤リマインダー] 組織 ${organizationId}: 対象スタッフなし`)
        continue
      }

      // 今日の出退勤記録を取得（出勤済みで退勤していない人を対象）
      const { data: todayRecords, error: recordsError } = await supabase
        .from('attendance_records')
        .select('user_id, check_in_time, check_out_time')
        .eq('organization_id', organizationId)
        .eq('date', today)

      if (recordsError) {
        console.error(`組織 ${organizationId} の出退勤記録取得エラー:`, recordsError)
        continue
      }

      // 出勤済みで退勤していないユーザーIDのSet
      const needCheckoutUserIds = new Set(
        (todayRecords || [])
          .filter((r) => r.check_in_time && !r.check_out_time)
          .map((r) => r.user_id)
      )

      // 退勤打刻が必要なユーザーを抽出
      const missingUsers = users.filter((user) => needCheckoutUserIds.has(user.id))

      if (missingUsers.length === 0) {
        console.log(`[退勤リマインダー] 組織 ${organizationId}: 全員退勤済みまたは未出勤`)
        continue
      }

      // 既にアラートが作成されているユーザーを除外
      const { data: existingAlerts } = await supabase
        .from('attendance_alerts')
        .select('target_user_id')
        .eq('organization_id', organizationId)
        .eq('target_date', today)
        .eq('alert_type', 'checkout_reminder')

      const alreadyAlertedUserIds = new Set(existingAlerts?.map((a) => a.target_user_id) || [])
      let usersNeedingAlert = missingUsers.filter((user) => !alreadyAlertedUserIds.has(user.id))

      // 休暇中のユーザーを除外
      const { data: todayLeaves } = await supabase
        .from('user_leave_records')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('leave_date', today)
        .eq('status', 'approved')

      const onLeaveUserIds = new Set(todayLeaves?.map((l) => l.user_id) || [])
      usersNeedingAlert = usersNeedingAlert.filter((user) => !onLeaveUserIds.has(user.id))

      if (onLeaveUserIds.size > 0) {
        console.log(`[退勤リマインダー] 組織 ${organizationId}: ${onLeaveUserIds.size}人が休暇中のため除外`)
      }

      if (usersNeedingAlert.length === 0) {
        console.log(`[退勤リマインダー] 組織 ${organizationId}: 全員にアラート送信済みまたは休暇中`)
        continue
      }

      // アラート作成
      const alerts = usersNeedingAlert.map((user) => {
        const pattern = workPatterns.find((p) => p.id === user.work_pattern_id)
        return {
          organization_id: organizationId,
          target_user_id: user.id,
          alert_type: 'checkout_reminder',
          target_date: today,
          title: '退勤打刻忘れ',
          message: `${user.name}さん、まだ退勤打刻がされていません。打刻をお願いします。`,
          metadata: {
            user_name: user.name,
            user_email: user.email,
            work_pattern_name: pattern?.name || '未設定',
            expected_checkout_time: pattern?.expected_checkout_time || null,
          },
        }
      })

      const { error: insertError } = await supabase.from('attendance_alerts').insert(alerts)

      if (insertError) {
        console.error(`[退勤リマインダー] 組織 ${organizationId} のアラート挿入エラー:`, insertError)
        continue
      }

      console.log(`[退勤リマインダー] 組織 ${organizationId}: ${alerts.length}件のアラートを生成`)
      totalAlerts += alerts.length

      // 通知を送信
      try {
        // 管理者/マネージャーにサマリー通知
        await notifyCheckoutReminder({
          organizationId,
          targetDate: today,
          missingUsers: usersNeedingAlert.map(u => ({
            id: u.id,
            name: u.name,
            email: u.email
          }))
        })

        // 個別通知を全員に送信
        for (const user of usersNeedingAlert) {
          await notifyIndividualCheckoutReminder({
            organizationId,
            userId: user.id,
            userName: user.name,
            targetDate: today
          })
        }

        console.log(`[退勤リマインダー] 組織 ${organizationId}: 通知送信完了`)
      } catch (notifyError) {
        console.error(`[退勤リマインダー] 組織 ${organizationId} の通知送信エラー:`, notifyError)
        // 通知エラーがあってもアラート生成は成功しているので続行
      }
    }

    console.log(`[退勤リマインダー] 処理完了: ${totalAlerts}件生成, ${skippedOrgs}組織スキップ`)

    return NextResponse.json({
      success: true,
      message: `退勤リマインダー処理完了: ${totalAlerts}件のアラートを生成しました`,
      processed: totalAlerts,
      skipped_organizations: skippedOrgs,
      date: today,
      time: `${currentHour}:${currentMinute}`,
    })
  } catch (error) {
    console.error('[退勤リマインダー] 処理エラー:', error)
    return NextResponse.json(
      { error: '退勤リマインダーの処理に失敗しました' },
      { status: 500 }
    )
  }
}
