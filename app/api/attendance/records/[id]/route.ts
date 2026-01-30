import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logAttendanceRecordUpdated, logAttendanceRecordDeleted } from '@/lib/audit-log'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

// PATCH /api/attendance/records/[id] - 勤怠記録の手動修正（管理者のみ）
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/records/[id]] PATCH CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const supabase = await createClient()
    const { id: recordId } = await params

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
      return NextResponse.json({ error: '権限がありません。管理者またはマネージャーのみが編集できます。' }, { status: 403 })
    }

    // 既存レコード取得
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: '勤怠記録が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const {
      clock_in_time,
      clock_out_time,
      clock_in_location_type,
      clock_in_site_id,
      clock_out_location_type,
      clock_out_site_id,
      edited_reason,
      is_holiday_work,
      manual_overtime_minutes,
    } = body

    // 必須項目チェック
    if (!clock_in_time) {
      return NextResponse.json({ error: '出勤時刻は必須です' }, { status: 400 })
    }

    if (!edited_reason || edited_reason.trim() === '') {
      return NextResponse.json({ error: '編集理由は必須です' }, { status: 400 })
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

    // 現場IDのバリデーション（現場出勤の場合）
    if (clock_in_location_type === 'site') {
      if (!clock_in_site_id) {
        return NextResponse.json({ error: '現場出勤の場合、現場IDは必須です' }, { status: 400 })
      }

      // 現場の存在確認
      const { data: site } = await supabase
        .from('sites')
        .select('id')
        .eq('id', clock_in_site_id)
        .eq('organization_id', userData?.organization_id)
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
        .eq('organization_id', userData?.organization_id)
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

    // 更新データ準備
    const now = new Date()
    const updateData: any = {
      clock_in_time: clockInDate.toISOString(),
      clock_in_location_type: clock_in_location_type || existingRecord.clock_in_location_type,
      clock_in_site_id: clock_in_location_type === 'site' ? clock_in_site_id : null,
      is_manually_edited: true,
      edited_by: user.id,
      edited_at: now.toISOString(),
      edited_reason,
      is_holiday_work: is_holiday_work !== undefined ? is_holiday_work : existingRecord.is_holiday_work,
      auto_break_deducted_minutes: autoBreakMinutes,
      manual_overtime_minutes: manual_overtime_minutes !== undefined ? manual_overtime_minutes : existingRecord.manual_overtime_minutes,
      updated_at: now.toISOString(),
    }

    if (clock_out_time) {
      updateData.clock_out_time = new Date(clock_out_time).toISOString()
      updateData.clock_out_location_type = clock_out_location_type || existingRecord.clock_out_location_type
      updateData.clock_out_site_id = clock_out_location_type === 'site' ? clock_out_site_id : null
    }

    // 更新実行
    const { data: updatedRecord, error: updateError } = await supabase
      .from('attendance_records')
      .update(updateData)
      .eq('id', recordId)
      .eq('organization_id', userData?.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Attendance record update error:', updateError)
      return NextResponse.json({ error: '勤怠記録の更新に失敗しました' }, { status: 500 })
    }

    // 監査ログ記録
    await logAttendanceRecordUpdated(
      recordId,
      existingRecord,
      updateData,
      user.id,
      userData.organization_id
    )

    return NextResponse.json({ success: true, record: updatedRecord })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/attendance/records/[id] - 勤怠記録の削除（管理者のみ）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/records/[id]] DELETE CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const supabase = await createClient()
    const { id: recordId } = await params

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
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 既存レコード確認
    const { data: existingRecord, error: fetchError } = await supabase
      .from('attendance_records')
      .select('*')
      .eq('id', recordId)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (fetchError || !existingRecord) {
      return NextResponse.json({ error: '勤怠記録が見つかりません' }, { status: 404 })
    }

    // 削除実行
    const { error: deleteError } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId)
      .eq('organization_id', userData?.organization_id)

    if (deleteError) {
      console.error('Attendance record delete error:', deleteError)
      return NextResponse.json({ error: '勤怠記録の削除に失敗しました' }, { status: 500 })
    }

    // 監査ログ記録
    await logAttendanceRecordDeleted(
      recordId,
      existingRecord,
      user.id,
      userData.organization_id
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
