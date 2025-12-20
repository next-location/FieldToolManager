import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/suppliers - 仕入先一覧取得
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

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 仕入先一覧取得
    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData?.organization_id)

    // フィルター適用
    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,name_kana.ilike.%${search}%,supplier_code.ilike.%${search}%,address.ilike.%${search}%,phone.ilike.%${search}%`
      )
    }

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: suppliers, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching suppliers:', error)
      return NextResponse.json({ error: '仕入先の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: suppliers,
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

// POST /api/suppliers - 仕入先作成
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

    // 管理者・リーダー権限チェック
    if (!['admin', 'leader'].includes(userData.role)) {
      return NextResponse.json({ error: '管理者またはリーダー権限が必要です' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 必須項目チェック
    if (!body.name) {
      return NextResponse.json(
        { error: '仕入先名は必須です' },
        { status: 400 }
      )
    }

    // 仕入先コード生成（SUP-001形式）
    const { data: existingSuppliers } = await supabase
      .from('suppliers')
      .select('supplier_code')
      .eq('organization_id', userData?.organization_id)
      .order('supplier_code', { ascending: false })
      .limit(1)

    let newCode = 'SUP-001'
    if (existingSuppliers && existingSuppliers.length > 0) {
      const lastCode = existingSuppliers[0].supplier_code
      const lastNumber = parseInt(lastCode.split('-')[1])
      newCode = `SUP-${String(lastNumber + 1).padStart(3, '0')}`
    }

    // 仕入先作成
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .insert({
        organization_id: userData?.organization_id,
        supplier_code: body.supplier_code || newCode,
        name: body.name,
        name_kana: body.name_kana || null,
        postal_code: body.postal_code || null,
        address: body.address || null,
        phone: body.phone || null,
        fax: body.fax || null,
        email: body.email || null,
        website: body.website || null,
        contact_person: body.contact_person || null,
        payment_terms: body.payment_terms || null,
        bank_name: body.bank_name || null,
        branch_name: body.branch_name || null,
        account_type: body.account_type || null,
        account_number: body.account_number || null,
        account_holder: body.account_holder || null,
        notes: body.notes || null,
        is_active: body.is_active !== undefined ? body.is_active : true,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating supplier:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'この仕入先コードは既に使用されています' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: '仕入先の作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ data: supplier }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
