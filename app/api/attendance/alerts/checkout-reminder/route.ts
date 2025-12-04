import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/attendance/alerts/checkout-reminder
 * 退勤忘れ通知を生成（定期実行用）
 * 設定時刻（デフォルト20:00）に退勤打刻忘れのスタッフに通知
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Cron認証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 日本時間で今日の日付を取得
    const now = new Date()
    const jstOffset = 9 * 60
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0]

    // 退勤リマインダーが有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organization_attendance_settings')
      .select(`
        organization_id,
        checkout_reminder_enabled,
        checkout_reminder_time,
        organizations (
          id,
          name
        )
      `)
      .eq('checkout_reminder_enabled', true)

    if (orgError || !organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: '退勤リマインダーが有効な組織がありません',
        processed: 0,
      })
    }

    let totalAlerts = 0

    // 各組織ごとに処理
    for (const org of organizations) {
      const organizationId = org.organization_id

      // 今日の出勤記録で退勤していないレコードを取得
      const { data: incompleteRecords, error: recordsError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          user_id,
          clock_in_time,
          users (
            id,
            name,
            email
          )
        `)
        .eq('organization_id', organizationId)
        .eq('date', today)
        .is('clock_out_time', null) // 退勤していない

      if (recordsError) {
        console.error(`組織 ${organizationId} の出勤記録取得エラー:`, recordsError)
        continue
      }

      if (!incompleteRecords || incompleteRecords.length === 0) {
        continue
      }

      // 退勤忘れのユーザーにアラート作成
      const alerts = incompleteRecords.map((record) => {
        const user = record.users as any

        // 勤務時間を計算
        const clockInTime = new Date(record.clock_in_time)
        const workingHours = Math.floor((now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60))

        return {
          organization_id: organizationId,
          target_user_id: record.user_id,
          alert_type: 'checkout_reminder',
          target_date: today,
          title: '退勤打刻忘れ',
          message: `${user.name}さん、退勤打刻がまだされていません。打刻をお願いします。（勤務時間: 約${workingHours}時間）`,
          metadata: {
            user_name: user.name,
            user_email: user.email,
            clock_in_time: record.clock_in_time,
            working_hours: workingHours,
            reminder_time: org.checkout_reminder_time,
          },
        }
      })

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
      message: `退勤リマインダー処理完了: ${totalAlerts}件のアラートを生成しました`,
      processed: totalAlerts,
      date: today,
    })
  } catch (error) {
    console.error('退勤リマインダー処理エラー:', error)
    return NextResponse.json(
      { error: '退勤リマインダーの処理に失敗しました' },
      { status: 500 }
    )
  }
}
