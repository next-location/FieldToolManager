import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/attendance/reports/monthly
 * 月次勤怠集計レポート取得
 * クエリパラメータ:
 * - year: number (必須)
 * - month: number (必須, 1-12)
 * - user_id: string (オプション, 指定時は特定ユーザーのみ)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者権限確認
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const year = parseInt(searchParams.get('year') || '')
    const month = parseInt(searchParams.get('month') || '')
    const targetUserId = searchParams.get('user_id')

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json({ error: '年月の指定が必要です' }, { status: 400 })
    }

    // 対象期間の開始日と終了日を計算
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // 月末
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    // 出勤記録を取得
    let query = supabase
      .from('attendance_records')
      .select(`
        id,
        user_id,
        date,
        clock_in_time,
        clock_out_time,
        clock_in_location_type,
        clock_out_location_type,
        break_records,
        auto_break_deducted_minutes,
        is_manually_edited,
        users!attendance_records_user_id_fkey (
          id,
          name,
          email,
          department
        )
      `)
      .eq('organization_id', userData?.organization_id)
      .gte('date', startDateStr)
      .lte('date', endDateStr)
      .order('date', { ascending: true })

    if (targetUserId) {
      query = query.eq('user_id', targetUserId)
    }

    const { data: records, error: recordsError } = await query

    if (recordsError) {
      console.error('出勤記録取得エラー:', recordsError)
      return NextResponse.json({ error: '出勤記録の取得に失敗しました' }, { status: 500 })
    }

    // ユーザー別に集計
    const userStats = new Map<
      string,
      {
        user_id: string
        user_name: string
        user_email: string
        department: string | null
        total_days: number // 出勤日数
        completed_days: number // 退勤完了日数
        incomplete_days: number // 退勤未完了日数
        total_work_minutes: number // 総勤務時間（分）
        total_break_minutes: number // 総休憩時間（分）
        avg_work_minutes: number // 平均勤務時間（分）
        overtime_days: number // 残業日数（8時間超）
        total_overtime_minutes: number // 総残業時間（分、15分単位切り捨て）
        late_days: number // 遅刻日数（10:00以降出勤）
        early_leave_days: number // 早退日数（17:00前退勤）
        manually_edited_days: number // 手動修正日数
        records: any[]
      }
    >()

    for (const record of records || []) {
      const userId = record.user_id
      const userInfo = record.users as any

      if (!userStats.has(userId)) {
        userStats.set(userId, {
          user_id: userId,
          user_name: userInfo?.name || '不明',
          user_email: userInfo?.email || '',
          department: userInfo?.department || null,
          total_days: 0,
          completed_days: 0,
          incomplete_days: 0,
          total_work_minutes: 0,
          total_break_minutes: 0,
          avg_work_minutes: 0,
          overtime_days: 0,
          total_overtime_minutes: 0,
          late_days: 0,
          early_leave_days: 0,
          manually_edited_days: 0,
          records: [],
        })
      }

      const stats = userStats.get(userId)!

      // 出勤日数
      stats.total_days++

      // 退勤完了/未完了
      if (record.clock_out_time) {
        stats.completed_days++
      } else {
        stats.incomplete_days++
      }

      // 勤務時間・休憩時間計算
      if (record.clock_in_time && record.clock_out_time) {
        const clockIn = new Date(record.clock_in_time)
        const clockOut = new Date(record.clock_out_time)
        const totalMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60))

        // 休憩時間計算
        let totalBreakMinutes = record.auto_break_deducted_minutes || 0
        if (record.break_records && Array.isArray(record.break_records)) {
          for (const breakRecord of record.break_records) {
            if (breakRecord.start && breakRecord.end) {
              const breakStart = new Date(breakRecord.start)
              const breakEnd = new Date(breakRecord.end)
              totalBreakMinutes += Math.floor((breakEnd.getTime() - breakStart.getTime()) / (1000 * 60))
            }
          }
        }

        const workMinutes = Math.max(0, totalMinutes - totalBreakMinutes)
        stats.total_work_minutes += workMinutes
        stats.total_break_minutes += totalBreakMinutes

        // 残業判定（8時間 = 480分超）
        if (workMinutes > 480) {
          stats.overtime_days++

          // 残業時間を15分単位で切り捨て
          const overtimeMinutes = workMinutes - 480
          const roundedOvertimeMinutes = Math.floor(overtimeMinutes / 15) * 15
          stats.total_overtime_minutes += roundedOvertimeMinutes
        }
      }

      // 遅刻判定（10:00以降出勤）
      if (record.clock_in_time) {
        const clockInTime = new Date(record.clock_in_time)
        const clockInHour = clockInTime.getUTCHours() + 9 // JST変換
        if (clockInHour >= 10) {
          stats.late_days++
        }
      }

      // 早退判定（17:00前退勤）
      if (record.clock_out_time) {
        const clockOutTime = new Date(record.clock_out_time)
        const clockOutHour = clockOutTime.getUTCHours() + 9 // JST変換
        if (clockOutHour < 17) {
          stats.early_leave_days++
        }
      }

      // 手動修正日数
      if (record.is_manually_edited) {
        stats.manually_edited_days++
      }

      stats.records.push(record)
    }

    // 平均勤務時間を計算
    userStats.forEach((stats) => {
      if (stats.completed_days > 0) {
        stats.avg_work_minutes = Math.floor(stats.total_work_minutes / stats.completed_days)
      }
    })

    // 配列に変換してソート（出勤日数降順）
    const statsArray = Array.from(userStats.values()).sort(
      (a, b) => b.total_days - a.total_days
    )

    // サマリー計算
    const summary = {
      period: `${year}年${month}月`,
      start_date: startDateStr,
      end_date: endDateStr,
      total_staff: statsArray.length,
      total_attendance_days: statsArray.reduce((sum, s) => sum + s.total_days, 0),
      total_work_hours: Math.floor(
        statsArray.reduce((sum, s) => sum + s.total_work_minutes, 0) / 60
      ),
      avg_work_hours_per_staff:
        statsArray.length > 0
          ? Math.floor(
              statsArray.reduce((sum, s) => sum + s.total_work_minutes, 0) /
                statsArray.length /
                60
            )
          : 0,
    }

    return NextResponse.json({
      success: true,
      summary,
      staff_stats: statsArray,
      total: statsArray.length,
    })
  } catch (error) {
    console.error('月次集計取得エラー:', error)
    return NextResponse.json({ error: '月次集計の取得に失敗しました' }, { status: 500 })
  }
}
