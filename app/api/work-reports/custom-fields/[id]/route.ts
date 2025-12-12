import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * PUT /api/work-reports/custom-fields/[id]
 * カスタムフィールド定義を更新（admin/super_adminのみ）
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック
    if (!['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const {
      field_label,
      field_type,
      field_options,
      display_order,
      is_required,
      placeholder,
      help_text,
    } = body

    // 更新
    const { data, error } = await supabase
      .from('work_report_custom_fields')
      .update({
        field_label,
        field_type,
        field_options: field_options || null,
        display_order,
        is_required,
        placeholder: placeholder || null,
        help_text: help_text || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating custom field:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'カスタムフィールドが見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ custom_field: data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/work-reports/custom-fields/[id]
 * カスタムフィールド定義を削除（admin/super_adminのみ）
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック
    if (!['admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    const { error } = await supabase
      .from('work_report_custom_fields')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (error) {
      console.error('Error deleting custom field:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
