import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // マネージャー以上のみ差し戻し可能
    if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '差し戻し権限がありません' }, { status: 403 })
    }

    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: '差し戻し理由が必要です' }, { status: 400 })
    }

    // 請求書を取得
    const { data: invoice, error: fetchError } = await supabase
      .from('billing_invoices')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !invoice) {
      return NextResponse.json({ error: '請求書が見つかりません' }, { status: 404 })
    }

    // 提出済み状態のみ差し戻し可能
    if (invoice.status !== 'submitted') {
      return NextResponse.json({ error: '提出済み状態の請求書のみ差し戻しできます' }, { status: 400 })
    }

    // ステータスを下書きに戻す
    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        status: 'draft',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: '差し戻しに失敗しました' }, { status: 500 })
    }

    // 操作履歴を記録
    await supabase.from('invoice_history').insert({
      invoice_id: id,
      organization_id: userData.organization_id,
      action_type: 'returned',
      performed_by: userData.id,
      performed_by_name: userData.name || 'Unknown',
      notes: `差し戻し理由: ${reason}`
    })

    // 作成者に通知を送信
    console.log('[RETURN INVOICE] Creating notification for user:', invoice.created_by)
    const { error: notificationError } = await supabase.from('notifications').insert({
      target_user_id: invoice.created_by,
      organization_id: userData.organization_id,
      type: 'estimate_returned', // 既存のタイプを使用（後でinvoice_returnedを追加）
      title: '請求書が差し戻されました',
      message: `請求書「${invoice.invoice_number}」が差し戻されました。理由: ${reason}`,
      metadata: {
        invoice_id: id,
        invoice_number: invoice.invoice_number,
        reason: reason
      }
    })

    if (notificationError) {
      console.error('[RETURN INVOICE] Notification error:', notificationError)
    } else {
      console.log('[RETURN INVOICE] Notification created successfully')
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Return invoice error:', error)
    return NextResponse.json(
      { error: error.message || '差し戻しに失敗しました' },
      { status: 500 }
    )
  }
}
