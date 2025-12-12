import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import type {
  GetAttendanceSettingsResponse,
  UpdateAttendanceSettingsRequest,
  UpdateAttendanceSettingsResponse,
  OrganizationAttendanceSettings,
} from '@/types/attendance'

// GET /api/attendance/settings - 組織の出退勤設定取得
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

    // ユーザーの組織ID取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 設定取得
    const { data: settings, error: settingsError } = await supabase
      .from('organization_attendance_settings')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .single()

    // 設定が存在しない場合はnullを返す（初期設定前）
    if (settingsError && settingsError.code === 'PGRST116') {
      return NextResponse.json<GetAttendanceSettingsResponse>({
        settings: null,
      })
    }

    if (settingsError) {
      console.error('Settings fetch error:', settingsError)
      return NextResponse.json(
        { error: '設定の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json<GetAttendanceSettingsResponse>({
      settings: settings as OrganizationAttendanceSettings,
    })
  } catch (error) {
    console.error('GET /api/attendance/settings error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}

// PUT /api/attendance/settings - 組織の出退勤設定更新
export async function PUT(request: NextRequest) {
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

    // ユーザーの組織IDと権限取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック（admin/manager のみ）
    if (!['admin', 'manager'].includes(userData.role)) {
      return NextResponse.json(
        { error: '設定変更の権限がありません' },
        { status: 403 }
      )
    }

    // リクエストボディ取得
    const body: UpdateAttendanceSettingsRequest = await request.json()

    // バリデーション
    if (body.office_qr_rotation_days && ![1, 3, 7, 30].includes(body.office_qr_rotation_days)) {
      return NextResponse.json(
        { error: 'QR更新頻度は1, 3, 7, 30日のいずれかを指定してください' },
        { status: 400 }
      )
    }

    // 新しい統一型のqr_rotation_daysバリデーション
    if (body.qr_rotation_days && ![1, 3, 7, 30].includes(body.qr_rotation_days)) {
      return NextResponse.json(
        { error: 'QR更新頻度は1, 3, 7, 30日のいずれかを指定してください' },
        { status: 400 }
      )
    }

    if (body.break_time_mode && !['none', 'simple', 'detailed'].includes(body.break_time_mode)) {
      return NextResponse.json(
        { error: '休憩時間モードが不正です' },
        { status: 400 }
      )
    }

    if (body.site_qr_type && !['leader', 'fixed', 'both'].includes(body.site_qr_type)) {
      return NextResponse.json(
        { error: '現場QRタイプが不正です' },
        { status: 400 }
      )
    }

    // 新しい統一型のclock_methodバリデーション
    if (body.clock_method && !['manual', 'qr_code', 'location'].includes(body.clock_method)) {
      return NextResponse.json(
        { error: '打刻方法が不正です' },
        { status: 400 }
      )
    }

    // 月次レポート日のバリデーション
    if (body.monthly_report_day !== undefined) {
      if (body.monthly_report_day < 1 || body.monthly_report_day > 31) {
        return NextResponse.json(
          { error: '月次レポート日は1-31の範囲で指定してください' },
          { status: 400 }
        )
      }
    }

    // 時刻フォーマットのバリデーション（HH:MM または HH:MM:SS）
    const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/

    // HH:MM形式の場合はHH:MM:SS形式に変換
    const normalizeTime = (time: string | undefined) => {
      if (!time) return undefined
      if (time.length === 5 && time.match(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)) {
        return `${time}:00`
      }
      return time
    }

    if (body.checkin_reminder_time) {
      body.checkin_reminder_time = normalizeTime(body.checkin_reminder_time)
      if (body.checkin_reminder_enabled && !timeRegex.test(body.checkin_reminder_time)) {
        return NextResponse.json(
          { error: '出勤リマインダー時刻のフォーマットが不正です（HH:MM形式）' },
          { status: 400 }
        )
      }
    }
    if (body.checkout_reminder_time) {
      body.checkout_reminder_time = normalizeTime(body.checkout_reminder_time)
      if (body.checkout_reminder_enabled && !timeRegex.test(body.checkout_reminder_time)) {
        return NextResponse.json(
          { error: '退勤リマインダー時刻のフォーマットが不正です（HH:MM形式）' },
          { status: 400 }
        )
      }
    }
    if (body.admin_daily_report_time) {
      body.admin_daily_report_time = normalizeTime(body.admin_daily_report_time)
      if (body.admin_daily_report_enabled && !timeRegex.test(body.admin_daily_report_time)) {
        return NextResponse.json(
          { error: '日次レポート時刻のフォーマットが不正です（HH:MM形式）' },
          { status: 400 }
        )
      }
    }

    // 更新データ準備
    const updateData = {
      ...body,
      organization_id: userData?.organization_id,
      updated_at: new Date().toISOString(),
    }

    // UPSERT（存在しなければINSERT、存在すればUPDATE）
    const { data: updatedSettings, error: updateError } = await supabase
      .from('organization_attendance_settings')
      .upsert(updateData, {
        onConflict: 'organization_id',
      })
      .select()
      .single()

    if (updateError) {
      console.error('Settings update error:', updateError)
      return NextResponse.json(
        { error: '設定の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json<UpdateAttendanceSettingsResponse>({
      settings: updatedSettings as OrganizationAttendanceSettings,
    })
  } catch (error) {
    console.error('PUT /api/attendance/settings error:', error)
    return NextResponse.json(
      { error: '内部サーバーエラー' },
      { status: 500 }
    )
  }
}
