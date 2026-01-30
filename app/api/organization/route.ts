import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// GET /api/organization - 組織情報取得
export async function GET() {
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 組織情報取得
    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData?.organization_id)
      .single()

    if (error) {
      console.error('Organization fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCH /api/organization - 組織情報更新（管理者のみ）
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得（roleチェック）
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者チェック
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 不審なパターン検出（主要テキストフィールド）
    const textFields = [
      { field: 'postal_code', value: body.postal_code, label: '郵便番号' },
      { field: 'address', value: body.address, label: '住所' },
      { field: 'phone', value: body.phone, label: '電話番号' },
      { field: 'fax', value: body.fax, label: 'FAX番号' },
      { field: 'invoice_registration_number', value: body.invoice_registration_number, label: 'インボイス登録番号' },
    ]

    for (const { value, label } of textFields) {
      if (value && hasSuspiciousPattern(value)) {
        return NextResponse.json(
          { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` },
          { status: 400 }
        )
      }
    }

    // 更新可能なフィールドのみ抽出（HTMLエスケープ処理）
    const updateData: any = {}
    if (body.postal_code !== undefined) updateData.postal_code = body.postal_code ? escapeHtml(body.postal_code) : null
    if (body.address !== undefined) updateData.address = body.address ? escapeHtml(body.address) : null
    if (body.phone !== undefined) updateData.phone = body.phone ? escapeHtml(body.phone) : null
    if (body.fax !== undefined) updateData.fax = body.fax ? escapeHtml(body.fax) : null
    if (body.company_seal_url !== undefined) updateData.company_seal_url = body.company_seal_url
    if (body.invoice_registration_number !== undefined) updateData.invoice_registration_number = body.invoice_registration_number ? escapeHtml(body.invoice_registration_number) : null

    // 組織情報更新
    const { data: organization, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', userData?.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Organization update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(organization)
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}