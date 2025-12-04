import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { AttendanceStatusResponse } from '@/types/attendance'

// GET /api/attendance/status - 今日の打刻状態取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 現在日時（JST）
    const now = new Date()
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const dateString = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    // 今日の出勤記録を取得
    const { data: todayRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select(`
        *,
        site:clock_in_site_id(name)
      `)
      .eq('organization_id', userData.organization_id)
      .eq('user_id', user.id)
      .eq('date', dateString)
      .maybeSingle()

    if (recordError) {
      console.error('Today record fetch error:', recordError)
      return NextResponse.json(
        { error: '出勤記録の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 打刻状態を返す
    const response: AttendanceStatusResponse = {
      today_record: todayRecord || null,
      is_clocked_in: todayRecord ? !todayRecord.clock_out_time : false,
      clock_in_time: todayRecord?.clock_in_time || null,
      location_type: todayRecord?.clock_in_location_type || null,
      site_name: todayRecord?.site?.name || null,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('GET /api/attendance/status error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}
