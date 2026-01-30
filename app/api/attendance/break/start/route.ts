import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/break/start] CSRF validation failed')
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
      return NextResponse.json({ error: '本日の出勤記録がありません。先に出勤打刻を行ってください。' }, { status: 400 })
    }

    // 既に退勤済みの場合はエラー
    if (todayRecord.clock_out_time) {
      return NextResponse.json({ error: '既に退勤しています。休憩を開始できません。' }, { status: 400 })
    }

    // 既存の休憩記録を取得
    const breakRecords = (todayRecord.break_records as any[]) || []

    // 既に休憩開始中かチェック（終了していない休憩があるか）
    const ongoingBreak = breakRecords.find((br) => br.start && !br.end)
    if (ongoingBreak) {
      return NextResponse.json({ error: '既に休憩を開始しています。先に休憩を終了してください。' }, { status: 400 })
    }

    // 組織設定を確認してbreak_time_modeをチェック
    const { data: settings } = await supabase
      .from('organization_attendance_settings')
      .select('break_time_mode')
      .eq('organization_id', userData?.organization_id)
      .single()

    const breakMode = settings?.break_time_mode || 'simple'

    // break_time_mode が 'none' の場合はエラー
    if (breakMode === 'none') {
      return NextResponse.json({ error: '休憩時間記録は無効に設定されています' }, { status: 400 })
    }

    // break_time_mode が 'simple' で既に1回休憩が完了している場合はエラー
    if (breakMode === 'simple' && breakRecords.some((br) => br.start && br.end)) {
      return NextResponse.json({ error: 'シンプルモードでは1日1回のみ休憩を記録できます' }, { status: 400 })
    }

    // 新しい休憩を追加
    const newBreak = {
      start: now.toISOString(),
      end: null,
    }

    const updatedBreakRecords = [...breakRecords, newBreak]

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
      console.error('Break start error:', updateError)
      return NextResponse.json({ error: '休憩開始の記録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
