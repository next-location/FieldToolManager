import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/suppliers/:id - 仕入先詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 仕入先取得
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (error || !supplier) {
      return NextResponse.json({ error: '仕入先が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// PATCH /api/suppliers/:id - 仕入先更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 仕入先存在確認
    const { data: existingSupplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (!existingSupplier) {
      return NextResponse.json({ error: '仕入先が見つかりません' }, { status: 404 })
    }

    // 更新データ準備（supplier_codeは変更不可）
    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'name',
      'name_kana',
      'postal_code',
      'address',
      'phone',
      'fax',
      'email',
      'website',
      'contact_person',
      'payment_terms',
      'bank_name',
      'branch_name',
      'account_type',
      'account_number',
      'account_holder',
      'notes',
      'is_active',
    ]

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // 仕入先更新
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating supplier:', error)
      return NextResponse.json({ error: '仕入先の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ data: supplier })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/suppliers/:id - 仕入先削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 発注書が存在するかチェック
    const { data: orders, error: checkError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('supplier_id', id)
      .limit(1)

    if (checkError) {
      console.error('Error checking orders:', checkError)
    }

    if (orders && orders.length > 0) {
      return NextResponse.json(
        { error: 'この仕入先には発注書が紐付いているため削除できません' },
        { status: 400 }
      )
    }

    // 仕入先削除
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (error) {
      console.error('Error deleting supplier:', error)
      return NextResponse.json({ error: '仕入先の削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ message: '仕入先を削除しました' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
