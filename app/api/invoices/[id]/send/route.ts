import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logInvoiceSent } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF検証（セキュリティ強化）
  }

  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userData } = await supabase
      .from('users')
      .select('id, role, organization_id, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 請求書を取得
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select('invoice_number, status, created_by')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // manager以上、または作成者本人（リーダー）のみ送付可能
    const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userData.role)
    const isCreator = invoice.created_by === userData.id

    if (!isManagerOrAdmin && !isCreator) {
      return NextResponse.json({ error: '送付権限がありません' }, { status: 403 })
    }

    // 承認済み状態のみ送付可能
    if (invoice.status !== 'approved') {
      return NextResponse.json({ error: '承認済み状態の請求書のみ送付できます' }, { status: 400 })
    }

    // ステータスを送付済みに変更
    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        status: 'sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'ステータス変更に失敗しました' }, { status: 500 })
    }

    // 操作履歴を記録
    await supabase.from('invoice_history').insert({
      invoice_id: id,
      organization_id: userData.organization_id,
      action_type: 'sent',
      performed_by: userData.id,
      performed_by_name: userData.name || 'Unknown',
      notes: '顧客に送付済み'
    })

    // 監査ログを記録
    await logInvoiceSent(id, {
      invoice_number: invoice.invoice_number,
      sent_by: userData.name || 'Unknown',
      sent_at: new Date().toISOString(),
    }, user.id, userData.organization_id)

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Send invoice error:', error)
    return NextResponse.json(
      { error: error.message || 'ステータス変更に失敗しました' },
      { status: 500 }
    )
  }
}
