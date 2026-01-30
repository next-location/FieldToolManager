import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/break/end] CSRF validation failed')
    return csrfErrorResponse()
  }

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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // JST現在時刻取得
    const now = new Date()
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const dateString = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    // 今日の出勤記録を取得
    const { data: todayRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .eq('user_id', user.id)
      .eq('date', dateString)
      .single()

    if (recordError || !todayRecord) {
      return NextResponse.json({ error: '本日の出勤記録がありません' }, { status: 400 })
    }

    // 既に退勤済みの場合はエラー
    if (todayRecord.clock_out_time) {
      return NextResponse.json({ error: '既に退勤しています' }, { status: 400 })
    }

    // 既存の休憩記録を取得
    const breakRecords = (todayRecord.break_records as any[]) || []

    // 休憩開始中（終了していない休憩）を探す
    const ongoingBreakIndex = breakRecords.findIndex((br) => br.start && !br.end)
    if (ongoingBreakIndex === -1) {
      return NextResponse.json({ error: '休憩が開始されていません。先に休憩を開始してください。' }, { status: 400 })
    }

    // 休憩開始時刻を取得
    const breakStartTime = new Date(breakRecords[ongoingBreakIndex].start)

    // 休憩終了時刻が休憩開始時刻より後であることを確認
    if (now <= breakStartTime) {
      return NextResponse.json({ error: '休憩終了時刻は休憩開始時刻より後である必要があります' }, { status: 400 })
    }

    // 休憩記録を更新
    const updatedBreakRecords = [...breakRecords]
    updatedBreakRecords[ongoingBreakIndex] = {
      ...updatedBreakRecords[ongoingBreakIndex],
      end: now.toISOString(),
    }

    // attendance_recordsを更新
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        break_records: updatedBreakRecords,
        updated_at: now.toISOString(),
      })
      .eq('id', todayRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Break end error:', updateError)
      return NextResponse.json({ error: '休憩終了の記録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
