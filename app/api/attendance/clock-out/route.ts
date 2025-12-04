import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ClockOutRequest, ClockOutResponse } from '@/types/attendance'

// POST /api/attendance/clock-out - 退勤打刻
export async function POST(request: NextRequest) {
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
      .select('organization_id, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // リクエストボディ取得
    const body: ClockOutRequest = await request.json()

    // バリデーション
    if (!['office', 'site', 'remote', 'direct_home'].includes(body.location_type)) {
      return NextResponse.json(
        { error: '不正な退勤場所タイプです' },
        { status: 400 }
      )
    }

    if (body.location_type === 'site' && !body.site_id) {
      return NextResponse.json(
        { error: '現場退勤の場合はsite_idが必要です' },
        { status: 400 }
      )
    }

    if (!['manual', 'qr'].includes(body.method)) {
      return NextResponse.json(
        { error: '不正な打刻方法です' },
        { status: 400 }
      )
    }

    if (body.method === 'qr' && !body.qr_data) {
      return NextResponse.json(
        { error: 'QR打刻の場合はqr_dataが必要です' },
        { status: 400 }
      )
    }

    // 現在日時（JST）
    const now = new Date()
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const dateString = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    // 今日の出勤記録を取得
    const { data: todayRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('organization_id', userData.organization_id)
      .eq('user_id', user.id)
      .eq('date', dateString)
      .maybeSingle()

    if (recordError) {
      console.error('Today record check error:', recordError)
      return NextResponse.json(
        { error: '出勤記録の確認に失敗しました' },
        { status: 500 }
      )
    }

    if (!todayRecord) {
      return NextResponse.json(
        { error: '本日の出勤記録がありません。先に出勤打刻を行ってください' },
        { status: 400 }
      )
    }

    if (todayRecord.clock_out_time) {
      return NextResponse.json(
        { error: '本日は既に退勤打刻済みです' },
        { status: 400 }
      )
    }

    // QRコード検証（QR打刻の場合）
    if (body.method === 'qr' && body.qr_data) {
      // QR検証ロジックは後で実装（Phase 2）
      // 今はスキップして手動打刻と同じ処理
    }

    // 現場IDの検証（現場退勤の場合）
    if (body.location_type === 'site' && body.site_id) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id')
        .eq('id', body.site_id)
        .eq('organization_id', userData.organization_id)
        .single()

      if (siteError || !site) {
        return NextResponse.json(
          { error: '指定された現場が見つかりません' },
          { status: 404 }
        )
      }
    }

    // 出勤時刻と退勤時刻の妥当性チェック
    const clockInTime = new Date(todayRecord.clock_in_time)
    if (now <= clockInTime) {
      return NextResponse.json(
        { error: '退勤時刻は出勤時刻より後である必要があります' },
        { status: 400 }
      )
    }

    // 退勤記録を更新
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update({
        clock_out_time: now.toISOString(),
        clock_out_location_type: body.location_type,
        clock_out_site_id: body.site_id || null,
        clock_out_method: body.method,
        clock_out_device_type: body.device_type || null,
        updated_at: now.toISOString(),
      })
      .eq('id', todayRecord.id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: '退勤打刻の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json<ClockOutResponse>({
      record: updatedRecord,
    })
  } catch (error) {
    console.error('POST /api/attendance/clock-out error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}
