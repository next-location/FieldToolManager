import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/work-reports/custom-fields?site_id=xxx
 * カスタムフィールド定義を取得
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const siteId = searchParams.get('site_id')

    // 現場固有 + 組織全体のカスタムフィールドを取得
    const { data: customFields, error } = await supabase
      .from('work_report_custom_fields')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .or(siteId ? `site_id.eq.${siteId},site_id.is.null` : 'site_id.is.null')
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching custom fields:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ custom_fields: customFields || [] })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/work-reports/custom-fields
 * カスタムフィールド定義を作成（admin/super_adminのみ）
 */
export async function POST(request: NextRequest) {
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
      site_id,
      field_key,
      field_label,
      field_type,
      field_options,
      display_order,
      is_required,
      placeholder,
      help_text,
    } = body

    // バリデーション
    if (!field_key || !field_label || !field_type) {
      return NextResponse.json(
        { error: 'field_key, field_label, field_type は必須です' },
        { status: 400 }
      )
    }

    const validTypes = ['text', 'textarea', 'number', 'date', 'select', 'checkbox']
    if (!validTypes.includes(field_type)) {
      return NextResponse.json(
        { error: `field_type は ${validTypes.join(', ')} のいずれかである必要があります` },
        { status: 400 }
      )
    }

    // 挿入
    const { data, error } = await supabase
      .from('work_report_custom_fields')
      .insert({
        organization_id: userData?.organization_id,
        site_id: site_id || null,
        field_key,
        field_label,
        field_type,
        field_options: field_options || null,
        display_order: display_order ?? 0,
        is_required: is_required ?? false,
        placeholder: placeholder || null,
        help_text: help_text || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating custom field:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ custom_field: data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
