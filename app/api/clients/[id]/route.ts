import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logClientUpdated, logClientDeleted } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// GET /api/clients/:id - 取引先詳細取得
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

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 取引先取得
    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (error || !client) {
      return NextResponse.json({ error: '取引先が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ data: client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// PATCH /api/clients/:id - 取引先更新
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

    // 管理者権限チェック
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 取引先存在確認（更新前のデータを取得）
    const { data: existingClient } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (!existingClient) {
      return NextResponse.json({ error: '取引先が見つかりません' }, { status: 404 })
    }

    // 不審なパターン検出（主要なテキストフィールド）
    const textFieldsToCheck = [
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

    for (const { value, label } of textFieldsToCheck) {
      if (value !== undefined && value !== null && hasSuspiciousPattern(value)) {
        return NextResponse.json(
          { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` },
          { status: 400 }
        )
      }
    }

    // 更新データ準備（HTMLエスケープ適用）
    const updateData: any = {}

    // テキストフィールドのエスケープ処理
    const textFields = [
      'name', 'name_kana', 'short_name', 'industry', 'address',
      'contact_person', 'contact_department', 'payment_terms',
      'bank_name', 'bank_branch', 'bank_account_holder', 'notes', 'internal_notes'
    ]

    textFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field] ? escapeHtml(body[field]) : null
      }
    })

    // その他のフィールド（エスケープ不要）
    const otherFields = [
      'client_type', 'postal_code', 'phone', 'fax', 'email', 'website',
      'contact_phone', 'contact_email', 'payment_method', 'payment_due_days',
      'bank_account_type', 'bank_account_number', 'credit_limit', 'current_balance',
      'tax_id', 'tax_registration_number', 'is_tax_exempt',
      'first_transaction_date', 'last_transaction_date',
      'total_transaction_count', 'total_transaction_amount', 'rating', 'is_active'
    ]

    otherFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // 取引先更新
    const { data: client, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating client:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'この取引先名は既に登録されています' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: '取引先の更新に失敗しました' }, { status: 500 })
    }

    // 監査ログ記録（変更された項目のみ）
    const oldData: Record<string, any> = {}
    const newData: Record<string, any> = {}

    // 監査ログに記録する項目
    const auditFields = [
      'name', 'name_kana', 'client_type', 'client_code', 'email',
      'phone', 'address', 'is_active', 'contact_person', 'payment_terms'
    ]

    auditFields.forEach((field) => {
      if (updateData[field] !== undefined && existingClient[field] !== updateData[field]) {
        oldData[field] = existingClient[field]
        newData[field] = updateData[field]
      }
    })

    if (Object.keys(newData).length > 0) {
      await logClientUpdated(id, oldData, newData, user.id, userData.organization_id)
    }

    return NextResponse.json({ data: client })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/clients/:id - 取引先削除（論理削除）
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

    // 削除前のデータを取得
    const { data: clientToDelete } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (!clientToDelete) {
      return NextResponse.json({ error: '取引先が見つかりません' }, { status: 404 })
    }

    // 関連現場の確認
    const { data: relatedSites, error: sitesError } = await supabase
      .from('sites')
      .select('id, name')
      .eq('client_id', id)
      .is('deleted_at', null)
      .limit(1)

    if (sitesError) {
      console.error('Error checking related sites:', sitesError)
    }

    if (relatedSites && relatedSites.length > 0) {
      return NextResponse.json(
        { error: 'この取引先に紐づく現場が存在するため削除できません' },
        { status: 400 }
      )
    }

    // 論理削除
    const { error } = await supabase
      .from('clients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (error) {
      console.error('Error deleting client:', error)
      return NextResponse.json({ error: '取引先の削除に失敗しました' }, { status: 500 })
    }

    // 監査ログ記録
    await logClientDeleted(id, {
      name: clientToDelete.name,
      name_kana: clientToDelete.name_kana,
      client_type: clientToDelete.client_type,
      client_code: clientToDelete.client_code,
      email: clientToDelete.email,
      phone: clientToDelete.phone,
      address: clientToDelete.address,
      is_active: clientToDelete.is_active,
    }, user.id, userData.organization_id)

    return NextResponse.json({ message: '取引先を削除しました' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
