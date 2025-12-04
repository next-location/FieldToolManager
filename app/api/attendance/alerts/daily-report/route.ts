import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/attendance/alerts/daily-report
 * 管理者向け日次レポート生成（定期実行用）
 * 前日の勤怠状況をサマリーして管理者に通知
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

    // 日本時間で昨日の日付を取得
    const now = new Date()
    const jstOffset = 9 * 60
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
    const yesterday = new Date(jstDate)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    // 日次レポートが有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organization_attendance_settings')
      .select(`
        organization_id,
        admin_daily_report_enabled,
        admin_daily_report_time,
        organizations (
          id,
          name
        )
      `)
      .eq('admin_daily_report_enabled', true)

    if (orgError || !organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: '日次レポートが有効な組織がありません',
        processed: 0,
      })
    }

    let totalReports = 0

    // 各組織ごとに処理
    for (const org of organizations) {
      const organizationId = org.organization_id

      // 組織の管理者を取得
      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', organizationId)
        .in('role', ['admin', 'manager'])
        .is('deleted_at', null)

      if (adminsError || !admins || admins.length === 0) {
        continue
      }

      // 昨日の出勤記録を取得
      const { data: records, error: recordsError } = await supabase
        .from('attendance_records')
        .select(`
          id,
          user_id,
          clock_in_time,
          clock_out_time,
          clock_in_location_type,
          clock_out_location_type,
          total_work_minutes,
          total_break_minutes,
          users (
            name
          )
        `)
        .eq('organization_id', organizationId)
        .eq('date', yesterdayStr)

      if (recordsError) {
        console.error(`組織 ${organizationId} の出勤記録取得エラー:`, recordsError)
        continue
      }

      // 統計計算
      const totalStaff = records?.length || 0
      const completedRecords = records?.filter((r) => r.clock_out_time) || []
      const incompleteRecords = records?.filter((r) => !r.clock_out_time) || []

      // 平均勤務時間（分）
      const avgWorkMinutes =
        completedRecords.length > 0
          ? completedRecords.reduce((sum, r) => sum + (r.total_work_minutes || 0), 0) /
            completedRecords.length
          : 0

      // 長時間労働者（12時間以上）
      const overtimeWorkers = completedRecords.filter(
        (r) => (r.total_work_minutes || 0) >= 12 * 60
      )

      // レポートメッセージ作成
      const message = `
【前日勤怠サマリー】
━━━━━━━━━━━━━━━━━━━━
日付: ${yesterdayStr}

■ 出勤状況
・出勤者数: ${totalStaff}人
・退勤完了: ${completedRecords.length}人
・退勤未完了: ${incompleteRecords.length}人

■ 勤務時間
・平均勤務時間: ${Math.floor(avgWorkMinutes / 60)}時間${Math.floor(avgWorkMinutes % 60)}分
${overtimeWorkers.length > 0 ? `・長時間労働者: ${overtimeWorkers.length}人（12時間以上）` : ''}

${
  incompleteRecords.length > 0
    ? `\n⚠️ 退勤未完了のスタッフ:\n${incompleteRecords
        .map((r: any) => `  - ${r.users?.name}`)
        .join('\n')}`
    : ''
}
━━━━━━━━━━━━━━━━━━━━
      `.trim()

      // 各管理者にアラート作成
      const alerts = admins.map((admin) => ({
        organization_id: organizationId,
        target_user_id: admin.id,
        alert_type: 'daily_report',
        target_date: yesterdayStr,
        title: `日次勤怠レポート（${yesterdayStr}）`,
        message: message,
        metadata: {
          total_staff: totalStaff,
          completed: completedRecords.length,
          incomplete: incompleteRecords.length,
          avg_work_minutes: Math.floor(avgWorkMinutes),
          overtime_workers: overtimeWorkers.length,
          report_date: yesterdayStr,
        },
      }))

      if (alerts.length > 0) {
        const { error: insertError } = await supabase.from('attendance_alerts').insert(alerts)

        if (insertError) {
          console.error(`組織 ${organizationId} のレポート挿入エラー:`, insertError)
        } else {
          totalReports += alerts.length
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `日次レポート処理完了: ${totalReports}件のレポートを生成しました`,
      processed: totalReports,
      date: yesterdayStr,
    })
  } catch (error) {
    console.error('日次レポート処理エラー:', error)
    return NextResponse.json({ error: '日次レポートの処理に失敗しました' }, { status: 500 })
  }
}
