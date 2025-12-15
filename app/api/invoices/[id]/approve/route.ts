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
      return NextResponse.json({ error: '承認権限がありません' }, { status: 403 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { notes } = body

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
        { error: '承認できるのは提出済みの請求書のみです' },
        { status: 400 }
      )
    }

    // 請求書を承認
    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        status: 'approved',
        manager_approved_at: new Date().toISOString(),
        manager_approved_by: user.id,
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
        action_type: 'approved',
        performed_by: user.id,
        performed_by_name: userData?.name || 'Unknown',
        notes: notes || '請求書を承認しました'
      })

    // 通知を作成（作成者へ）
    if (invoice.created_by) {
      await supabase
        .from('notifications')
        .insert({
          user_id: invoice.created_by,
          organization_id: userData?.organization_id,
          type: 'invoice_approved',
          title: '請求書が承認されました',
          message: `請求書「${invoice.invoice_number}」が承認されました`,
          related_id: id,
          related_type: 'invoice'
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error approving invoice:', error)
    return NextResponse.json(
      { error: '請求書の承認に失敗しました' },
      { status: 500 }
    )
  }
}
