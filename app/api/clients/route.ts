import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logClientCreated } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// GET /api/clients - 取引先一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得（権限チェック用）
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リーダー以上は閲覧可能
    if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const clientType = searchParams.get('client_type')
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 取引先一覧取得
    let query = supabase
      .from('clients')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)

    // フィルター適用
    if (clientType && clientType !== 'all') {
      query = query.eq('client_type', clientType)
    }

    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,name_kana.ilike.%${search}%,client_code.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: clients, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching clients:', error)
      return NextResponse.json({ error: '取引先の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: clients,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/clients - 取引先作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 必須項目チェック
    if (!body.name || !body.client_type) {
      return NextResponse.json(
        { error: '取引先名と取引先分類は必須です' },
        { status: 400 }
      )
    }

    // 不審なパターン検出（主要なテキストフィールド）
    const textFields = [
      { field: 'name', value: body.name, label: '取引先名' },
      { field: 'name_kana', value: body.name_kana, label: '取引先名（カナ）' },
      { field: 'short_name', value: body.short_name, label: '略称' },
      { field: 'address', value: body.address, label: '住所' },
      { field: 'contact_person', value: body.contact_person, label: '担当者名' },
      { field: 'contact_department', value: body.contact_department, label: '担当者部署' },
      { field: 'payment_terms', value: body.payment_terms, label: '支払条件' },
      { field: 'bank_name', value: body.bank_name, label: '銀行名' },
      { field: 'bank_branch', value: body.bank_branch, label: '支店名' },
      { field: 'bank_account_holder', value: body.bank_account_holder, label: '口座名義' },
      { field: 'notes', value: body.notes, label: '備考' },
      { field: 'internal_notes', value: body.internal_notes, label: '社内メモ' },
    ]

    for (const { value, label } of textFields) {
      if (value && hasSuspiciousPattern(value)) {
        return NextResponse.json(
          { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` },
          { status: 400 }
        )
      }
    }

    // 取引先コード生成
    const { data: codeData, error: codeError } = await supabase.rpc('generate_client_code', {
      org_id: userData?.organization_id,
      prefix: 'CL',
    })

    if (codeError) {
      console.error('Error generating client code:', codeError)
      return NextResponse.json(
        { error: '取引先コードの生成に失敗しました' },
        { status: 500 }
      )
    }

    // HTMLエスケープ処理
    const sanitizedData = {
      organization_id: userData?.organization_id,
      client_code: codeData,
      name: escapeHtml(body.name),
      name_kana: body.name_kana ? escapeHtml(body.name_kana) : null,
      short_name: body.short_name ? escapeHtml(body.short_name) : null,
      client_type: body.client_type,
      industry: body.industry ? escapeHtml(body.industry) : null,
      postal_code: body.postal_code || null,
      address: body.address ? escapeHtml(body.address) : null,
      phone: body.phone || null,
      fax: body.fax || null,
      email: body.email || null,
      website: body.website || null,
      contact_person: body.contact_person ? escapeHtml(body.contact_person) : null,
      contact_department: body.contact_department ? escapeHtml(body.contact_department) : null,
      contact_phone: body.contact_phone || null,
      contact_email: body.contact_email || null,
      payment_terms: body.payment_terms ? escapeHtml(body.payment_terms) : null,
      payment_method: body.payment_method || null,
      payment_due_days: body.payment_due_days || 30,
      bank_name: body.bank_name ? escapeHtml(body.bank_name) : null,
      bank_branch: body.bank_branch ? escapeHtml(body.bank_branch) : null,
      bank_account_type: body.bank_account_type || null,
      bank_account_number: body.bank_account_number || null,
      bank_account_holder: body.bank_account_holder ? escapeHtml(body.bank_account_holder) : null,
      credit_limit: body.credit_limit || null,
      tax_id: body.tax_id || null,
      tax_registration_number: body.tax_registration_number || null,
      is_tax_exempt: body.is_tax_exempt || false,
      rating: body.rating || null,
      notes: body.notes ? escapeHtml(body.notes) : null,
      internal_notes: body.internal_notes ? escapeHtml(body.internal_notes) : null,
      is_active: body.is_active !== undefined ? body.is_active : true,
    }

    // 取引先作成
    const { data: client, error } = await supabase
      .from('clients')
      .insert(sanitizedData)
      .select()
      .single()

    if (error) {
      console.error('Error creating client:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'この取引先名は既に登録されています' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: '取引先の作成に失敗しました' }, { status: 500 })
    }

    // 監査ログ記録（エスケープ済みデータを記録）
    await logClientCreated(client.id, {
      name: client.name,
      name_kana: client.name_kana,
      client_type: client.client_type,
      client_code: client.client_code,
      email: client.email,
      phone: client.phone,
      address: client.address,
      is_active: client.is_active,
    }, user.id, userData.organization_id)

    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
