import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/attendance/alerts/checkin-reminder
 * 出勤忘れ通知を生成（定期実行用）
 * 設定時刻（デフォルト10:00）に未出勤のスタッフに通知
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

    // 出勤リマインダーが有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organization_attendance_settings')
      .select(`
        organization_id,
        checkin_reminder_enabled,
        checkin_reminder_time,
        organizations (
          id,
          name
        )
      `)
      .eq('checkin_reminder_enabled', true)

    if (orgError || !organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: '出勤リマインダーが有効な組織がありません',
        processed: 0,
      })
    }

    let totalAlerts = 0

    // 各組織ごとに処理
    for (const org of organizations) {
      const organizationId = org.organization_id

      // その組織の全スタッフを取得（削除されていない）
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      if (usersError || !users || users.length === 0) {
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

      // 未出勤のユーザーにアラート作成
      const alerts = users
        .filter((user) => !checkedInUserIds.has(user.id))
        .map((user) => ({
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

      if (alerts.length > 0) {
        const { error: insertError } = await supabase.from('attendance_alerts').insert(alerts)

        if (insertError) {
          console.error(`組織 ${organizationId} のアラート挿入エラー:`, insertError)
        } else {
          totalAlerts += alerts.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `出勤リマインダー処理完了: ${totalAlerts}件のアラートを生成しました`,
      processed: totalAlerts,
      date: today,
    })
  } catch (error) {
    console.error('出勤リマインダー処理エラー:', error)
    return NextResponse.json(
      { error: '出勤リマインダーの処理に失敗しました' },
      { status: 500 }
    )
  }
}
