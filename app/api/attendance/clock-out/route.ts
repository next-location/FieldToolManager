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

    // ユーザー情報と勤務パターンを取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        organization_id,
        name,
        work_pattern_id,
        is_shift_work,
        work_patterns (
          id,
          name,
          is_night_shift
        )
      `)
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 夜勤パターンかどうかを判定
    const isNightShift = userData.work_patterns?.is_night_shift || false

    // リクエストボディ取得
    const body: ClockOutRequest = await request.json()

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
    }

    // 現在日時（JST）
    const now = new Date()
    const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const dateString = jstDate.toISOString().split('T')[0] // YYYY-MM-DD

    // まず今日の出勤記録を取得
    let { data: todayRecord, error: recordError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('organization_id', userData?.organization_id)
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

    // 今日の記録が見つからず、かつ夜勤パターンの場合は過去の未退勤記録を確認
    if (!todayRecord && isNightShift) {
      // 過去7日分の未退勤記録を取得（最新順）
      const sevenDaysAgo = new Date(jstDate)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0]

      const { data: unclockoutRecords, error: unclockoutError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('organization_id', userData?.organization_id)
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgoString)
        .lt('date', dateString) // 今日より前
        .is('clock_out_time', null) // 退勤未打刻のもののみ
        .order('date', { ascending: false })

      if (!unclockoutError && unclockoutRecords && unclockoutRecords.length > 0) {
        // 最新の未退勤記録を確認
        const latestRecord = unclockoutRecords[0]
        const clockInTime = new Date(latestRecord.clock_in_time)
        const clockInHour = new Date(clockInTime.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' })).getHours()

        // 昨日の記録で16:00以降の出勤なら夜勤として処理
        const yesterday = new Date(jstDate)
        yesterday.setDate(yesterday.getDate() - 1)
        const yesterdayString = yesterday.toISOString().split('T')[0]

        if (latestRecord.date === yesterdayString && clockInHour >= 16) {
          // 昨日の夜勤として処理
          todayRecord = latestRecord
        } else if (latestRecord.date === yesterdayString) {
          // 昨日の記録だが16:00より前 → 休日チェック
          const holidayCheckRes = await fetch(new URL('/api/attendance/check-holiday', request.url).toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Cookie: request.headers.get('cookie') || '',
            },
            body: JSON.stringify({ date: yesterdayString }),
          })

          if (holidayCheckRes.ok) {
            const holidayCheck = await holidayCheckRes.json()
            if (holidayCheck.is_holiday && latestRecord.is_holiday_work) {
              // 前日が休日で休日出勤の記録 → 夜勤の可能性
              todayRecord = latestRecord
            } else if (unclockoutRecords.length > 1) {
              // 複数の未退勤記録がある
              const dates = unclockoutRecords.map(r => r.date).join(', ')
              return NextResponse.json(
                { error: `複数の未退勤記録があります（${dates}）。管理者に確認してください。` },
                { status: 400 }
              )
            } else {
              // 単一の打刻忘れ
              return NextResponse.json(
                { error: `${latestRecord.date}の退勤が未打刻です。先に退勤処理を行ってください。` },
                { status: 400 }
              )
            }
          }
        } else if (unclockoutRecords.length > 1) {
          // 2日以上前の未退勤記録が複数ある
          const dates = unclockoutRecords.map(r => r.date).join(', ')
          return NextResponse.json(
            { error: `複数の未退勤記録があります（${dates}）。管理者に確認してください。` },
            { status: 400 }
          )
        } else {
          // 2日以上前の単一の未退勤記録
          return NextResponse.json(
            { error: `${latestRecord.date}の退勤が未打刻です。先に退勤処理を行ってください。` },
            { status: 400 }
          )
        }
      }
    }

    // 通常勤務で今日の記録が見つからない場合、過去の未退勤記録をチェック
    if (!todayRecord && !isNightShift) {
      // 過去7日分の未退勤記録を確認
      const sevenDaysAgo = new Date(jstDate)
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sevenDaysAgoString = sevenDaysAgo.toISOString().split('T')[0]

      const { data: unclockoutRecords, error: unclockoutError } = await supabase
        .from('attendance_records')
        .select('date')
        .eq('organization_id', userData?.organization_id)
        .eq('user_id', user.id)
        .gte('date', sevenDaysAgoString)
        .lt('date', dateString) // 今日より前
        .is('clock_out_time', null) // 退勤未打刻のもののみ
        .order('date', { ascending: false })

      if (!unclockoutError && unclockoutRecords && unclockoutRecords.length > 0) {
        const dates = unclockoutRecords.map(r => r.date).join(', ')
        if (unclockoutRecords.length === 1) {
          return NextResponse.json(
            { error: `${dates}の退勤が未打刻です。先に退勤処理を行ってください。` },
            { status: 400 }
          )
        } else {
          return NextResponse.json(
            { error: `複数の未退勤記録があります（${dates}）。管理者に確認してください。` },
            { status: 400 }
          )
        }
      }
    }

    if (!todayRecord) {
      return NextResponse.json(
        { error: '出勤記録がありません。先に出勤打刻を行ってください' },
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

    // 現場IDの検証（現場退勤の場合）
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

    // 出勤時刻と退勤時刻の妥当性チェック
    const clockInTime = new Date(todayRecord.clock_in_time)
    if (now <= clockInTime) {
      return NextResponse.json(
        { error: '退勤時刻は出勤時刻より後である必要があります' },
        { status: 400 }
      )
    }

    // 退勤記録を更新
    const updateData: any = {
      clock_out_time: now.toISOString(),
      clock_out_location_type: body.location_type,
      clock_out_site_id: body.site_id || null,
      clock_out_method: body.method,
      clock_out_device_type: body.device_type || null,
      updated_at: now.toISOString(),
    }

    // 休憩時間が指定されている場合は記録
    if (body.break_minutes !== undefined && body.break_minutes !== null) {
      updateData.break_minutes = body.break_minutes
    }

    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update(updateData)
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
