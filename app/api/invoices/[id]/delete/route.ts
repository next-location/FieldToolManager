import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[INVOICES DELETE API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const { id } = await params
    const supabase = await createClient()

    // ユーザー認証
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // リーダー以上の権限チェック
    if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
      return NextResponse.json({ error: '削除権限がありません' }, { status: 403 })
    }

    // 請求書を取得
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select('status, created_by, organization_id')
      .eq('id', id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // 組織チェック
    if (invoice.organization_id !== userData?.organization_id) {
      return NextResponse.json({ error: 'アクセス権限がありません' }, { status: 403 })
    }

    // ステータスチェック：下書きのみ削除可能
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { error: '下書き状態の請求書のみ削除できます' },
        { status: 400 }
      )
    }

    // リーダーは自分が作成した請求書のみ削除可能
    const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userData?.role || '')
    if (!isManagerOrAdmin && invoice.created_by !== user.id) {
      return NextResponse.json(
        { error: '自分が作成した請求書のみ削除できます' },
        { status: 403 }
      )
    }

    // 請求書を削除（論理削除）
    const { error: deleteError } = await supabase
      .from('billing_invoices')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      throw deleteError
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting invoice:', error)
    return NextResponse.json(
      { error: '請求書の削除に失敗しました' },
      { status: 500 }
    )
  }
}
