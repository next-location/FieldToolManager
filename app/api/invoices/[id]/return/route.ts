import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
      .select('role, organization_id, name')
      .eq('id', user.id)
      .single()

    // マネージャー以上の権限チェック
    if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
      return NextResponse.json({ error: '差し戻し権限がありません' }, { status: 403 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json({ error: '差し戻し理由を入力してください' }, { status: 400 })
    }

    // 請求書を取得
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック
    if (invoice.status !== 'submitted') {
      return NextResponse.json(
        { error: '差し戻しできるのは提出済みの請求書のみです' },
        { status: 400 }
      )
    }

    // 請求書を下書きに戻す
    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) throw updateError

    // 履歴を記録
    await supabase
      .from('invoice_history')
      .insert({
        invoice_id: id,
        organization_id: userData?.organization_id,
        action_type: 'returned',
        performed_by: user.id,
        performed_by_name: userData?.name || 'Unknown',
        notes: `差し戻し理由: ${reason}`
      })

    // 通知を作成（作成者へ）
    if (invoice.created_by) {
      await supabase
        .from('notifications')
        .insert({
          user_id: invoice.created_by,
          organization_id: userData?.organization_id,
          type: 'invoice_returned',
          title: '請求書が差し戻されました',
          message: `請求書「${invoice.invoice_number}」が差し戻されました。理由: ${reason}`,
          related_id: id,
          related_type: 'invoice'
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error returning invoice:', error)
    return NextResponse.json(
      { error: '請求書の差し戻しに失敗しました' },
      { status: 500 }
    )
  }
}
