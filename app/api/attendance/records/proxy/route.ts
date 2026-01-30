import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAttendanceRecordCreated } from '@/lib/audit-log'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// POST /api/attendance/records/proxy - 代理打刻（管理者・マネージャーのみ）
export async function POST(request: NextRequest) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/records/proxy] CSRF validation failed')
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

    // 権限チェック（admin または manager のみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません。管理者またはマネージャーのみが代理打刻できます。' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const {
      user_id,
      clock_in_time,
      clock_out_time,
      clock_in_location_type,
      clock_in_site_id,
      clock_out_location_type,
      clock_out_site_id,
      proxy_reason,
      is_holiday_work,
    } = body

    // 必須項目チェック
    if (!user_id) {
      return NextResponse.json({ error: 'スタッフIDは必須です' }, { status: 400 })
    }

    if (!clock_in_time) {
      return NextResponse.json({ error: '出勤時刻は必須です' }, { status: 400 })
    }

    if (!proxy_reason || proxy_reason.trim() === '') {
      return NextResponse.json({ error: '代理打刻理由は必須です' }, { status: 400 })
    }

    // 不審なパターン検出
    if (hasSuspiciousPattern(proxy_reason)) {
      return NextResponse.json(
        { error: '代理打刻理由に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' },
        { status: 400 }
      )
    }

    // 対象スタッフが同じ組織に所属しているか確認
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('id, name, organization_id')
      .eq('id', user_id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: '指定されたスタッフが見つかりません' }, { status: 404 })
    }

    // 時刻の妥当性チェック
    const clockInDate = new Date(clock_in_time)
    if (isNaN(clockInDate.getTime())) {
      return NextResponse.json({ error: '出勤時刻の形式が不正です' }, { status: 400 })
    }

    if (clock_out_time) {
      const clockOutDate = new Date(clock_out_time)
      if (isNaN(clockOutDate.getTime())) {
        return NextResponse.json({ error: '退勤時刻の形式が不正です' }, { status: 400 })
      }

      if (clockOutDate <= clockInDate) {
        return NextResponse.json({ error: '退勤時刻は出勤時刻より後である必要があります' }, { status: 400 })
      }
    }

    // 同日に同じユーザーの記録が既に存在するかチェック
    const targetDate = clockInDate.toISOString().split('T')[0] // YYYY-MM-DD
    const { data: existingRecords, error: checkError } = await supabase
      .from('attendance_records')
      .select('id')
      .eq('user_id', user_id)
      .eq('organization_id', userData.organization_id)
      .gte('clock_in_time', `${targetDate}T00:00:00`)
      .lt('clock_in_time', `${targetDate}T23:59:59`)

    if (checkError) {
      console.error('Existing record check error:', checkError)
      return NextResponse.json({ error: '既存記録の確認に失敗しました' }, { status: 500 })
    }

    if (existingRecords && existingRecords.length > 0) {
      return NextResponse.json(
        { error: `${targetDate}には既に${targetUser.name}の打刻記録が存在します。編集機能をご利用ください。` },
        { status: 400 }
      )
    }

    // 現場IDのバリデーション（現場出勤の場合）
    if (clock_in_location_type === 'site') {
      if (!clock_in_site_id) {
        return NextResponse.json({ error: '現場出勤の場合、現場IDは必須です' }, { status: 400 })
      }

      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('id', clock_in_site_id)
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null)
        .single()

      if (!site) {
        return NextResponse.json({ error: '指定された現場が見つかりません' }, { status: 400 })
      }
    }

    if (clock_out_location_type === 'site' && clock_out_site_id) {
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('id', clock_out_site_id)
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null)
        .single()

      if (!site) {
        return NextResponse.json({ error: '指定された退勤現場が見つかりません' }, { status: 400 })
      }
    }

    // 休憩時間の自動控除設定を取得
    const { data: attendanceSettings } = await supabase
      .from('organization_attendance_settings')
      .select('auto_break_deduction, auto_break_minutes')
      .eq('organization_id', userData.organization_id)
      .single()

    let autoBreakMinutes = 0
    if (clock_out_time && attendanceSettings?.auto_break_deduction) {
      autoBreakMinutes = attendanceSettings.auto_break_minutes || 0
    }

    // 新規レコード作成
    const now = new Date()
    const newRecord: any = {
      organization_id: userData.organization_id,
      user_id: user_id,
      date: targetDate, // YYYY-MM-DD形式
      clock_in_time: clockInDate.toISOString(),
      clock_in_location_type: clock_in_location_type || 'office',
      clock_in_site_id: clock_in_location_type === 'site' ? clock_in_site_id : null,
      clock_in_method: 'manual', // 代理打刻は常にmanual
      is_manually_edited: true,
      edited_by: user.id,
      edited_at: now.toISOString(),
      edited_reason: `【代理打刻】${escapeHtml(proxy_reason)}`,
      is_holiday_work: is_holiday_work || false,
      auto_break_deducted_minutes: autoBreakMinutes,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }

    if (clock_out_time) {
      newRecord.clock_out_time = new Date(clock_out_time).toISOString()
      newRecord.clock_out_location_type = clock_out_location_type || 'office'
      newRecord.clock_out_site_id = clock_out_location_type === 'site' ? clock_out_site_id : null
      newRecord.clock_out_method = 'manual' // 代理打刻は常にmanual
    }

    const { data: createdRecord, error: insertError } = await supabase
      .from('attendance_records')
      .insert(newRecord)
      .select()
      .single()

    if (insertError) {
      console.error('Attendance record insert error:', insertError)
      return NextResponse.json({ error: '代理打刻の登録に失敗しました' }, { status: 500 })
    }

    // 監査ログ記録
    await logAttendanceRecordCreated(
      createdRecord.id,
      newRecord,
      user.id,
      userData.organization_id
    )

    return NextResponse.json({ success: true, record: createdRecord })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
