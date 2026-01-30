import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type { ClockInRequest, ClockInResponse } from '@/types/attendance'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

// POST /api/attendance/clock-in - 出勤打刻
export async function POST(request: NextRequest) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/clock-in] CSRF validation failed')
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
    const body: ClockInRequest = await request.json()
    const isHolidayWork = body.is_holiday_work || false

    // バリデーション（打刻方法）
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

    // 手動打刻の場合のみ location_type をバリデーション（QR打刻はQR検証後に設定）
    if (body.method === 'manual') {
      if (!['office', 'site', 'remote'].includes(body.location_type)) {
        return NextResponse.json(
          { error: '不正な出勤場所タイプです' },
          { status: 400 }
        )
      }

      if (body.location_type === 'site' && !body.site_id) {
        return NextResponse.json(
          { error: '現場出勤の場合はsite_idが必要です' },
          { status: 400 }
        )
      }
    }

    // 現在日時（JST）
    const now = new Date()
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const dateString = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    // 今日の出退勤記録が既に存在するかチェック
    const { data: existingRecord, error: checkError } = await supabase
      .from('attendance_records')
      .select('id, clock_in_time')
      .eq('organization_id', userData?.organization_id)
      .eq('user_id', user.id)
      .eq('date', dateString)
      .maybeSingle()

    if (checkError) {
      console.error('Existing record check error:', checkError)
      return NextResponse.json(
        { error: '出勤記録の確認に失敗しました' },
        { status: 500 }
      )
    }

    if (existingRecord) {
      return NextResponse.json(
        { error: '本日は既に出勤打刻済みです' },
        { status: 400 }
      )
    }

    // 5分以内の重複打刻チェック（他の日付含む）
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString()
    const { data: recentRecords, error: recentError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('organization_id', userData?.organization_id)
      .eq('user_id', user.id)
      .gte('clock_in_time', fiveMinutesAgo)
      .limit(1)

    if (recentError) {
      console.error('Recent records check error:', recentError)
    } else if (recentRecords && recentRecords.length > 0) {
      return NextResponse.json(
        { error: '5分以内に既に打刻済みです。しばらく待ってから再度お試しください' },
        { status: 400 }
      )
    }

    // QRコード検証（QR打刻の場合）
    let qrValidation: any = null
    if (body.method === 'qr' && body.qr_data) {
      // QR検証APIを呼び出す
      const verifyResponse = await fetch(new URL('/api/attendance/qr/verify', request.url).toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ qr_data: body.qr_data }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        return NextResponse.json(
          { error: errorData.error || 'QRコードの検証に失敗しました' },
          { status: verifyResponse.status }
        )
      }

      qrValidation = await verifyResponse.json()

      // QR検証結果に基づいて location_type と site_id を上書き
      if (qrValidation.type === 'office') {
        body.location_type = 'office'
        body.site_id = undefined
      } else if (qrValidation.type === 'site' || qrValidation.type === 'site_fixed') {
        body.location_type = 'site'
        body.site_id = qrValidation.site_id
      }
    }

    // 現場IDの検証（現場出勤の場合）
    if (body.location_type === 'site' && body.site_id) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id')
        .eq('id', body.site_id)
        .eq('organization_id', userData?.organization_id)
        .single()

      if (siteError || !site) {
        return NextResponse.json(
          { error: '指定された現場が見つかりません' },
          { status: 404 }
        )
      }
    }

    // 出勤記録を作成
    const attendanceData = {
      organization_id: userData?.organization_id,
      user_id: user.id,
      date: dateString,
      clock_in_time: now.toISOString(),
      clock_in_location_type: body.location_type,
      clock_in_site_id: body.site_id || null,
      clock_in_method: body.method,
      clock_in_device_type: body.device_type || null,
      planned_checkout_location_type: body.planned_checkout_location_type || null,
      planned_checkout_site_id: body.planned_checkout_site_id || null,
      is_holiday_work: isHolidayWork,
    }

    const { data: newRecord, error: insertError } = await supabase
      .from('attendance_records')
      .insert(attendanceData)
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: '出勤打刻の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json<ClockInResponse>({
      record: newRecord,
    })
  } catch (error) {
    console.error('POST /api/attendance/clock-in error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}
