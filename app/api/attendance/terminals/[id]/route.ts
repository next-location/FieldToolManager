import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/attendance/terminals/[id] - タブレット端末更新
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const terminalId = params.id

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

    // 既存端末の確認
    const { data: existingTerminal, error: fetchError } = await supabase
      .from('terminal_devices')
      .select('*')
      .eq('id', terminalId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingTerminal) {
      return NextResponse.json({ error: '端末が見つかりません' }, { status: 404 })
    }

    // リクエストボディ
    const body = await request.json()
    const { device_name, is_active } = body

    const updateData: any = {}

    if (device_name !== undefined) {
      if (device_name.trim() === '') {
        return NextResponse.json({ error: '端末名は必須です' }, { status: 400 })
      }
      updateData.device_name = device_name
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    // 更新
    const { data: updatedTerminal, error: updateError } = await supabase
      .from('terminal_devices')
      .update(updateData)
      .eq('id', terminalId)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Terminal update error:', updateError)
      return NextResponse.json({ error: '端末の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      terminal: updatedTerminal,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/attendance/terminals/[id] - タブレット端末削除
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const terminalId = params.id

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

    // 既存端末の確認
    const { data: existingTerminal, error: fetchError } = await supabase
      .from('terminal_devices')
      .select('id')
      .eq('id', terminalId)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingTerminal) {
      return NextResponse.json({ error: '端末が見つかりません' }, { status: 404 })
    }

    // 削除
    const { error: deleteError } = await supabase
      .from('terminal_devices')
      .delete()
      .eq('id', terminalId)
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('Terminal delete error:', deleteError)
      return NextResponse.json({ error: '端末の削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
