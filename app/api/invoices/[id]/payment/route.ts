import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { logInvoiceUpdated } from '@/lib/audit-log'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[INVOICES PAYMENT API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { amount, payment_method, reference_number, notes, payment_date } = body

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

    // マネージャー以上のみ入金登録可能
    if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ error: '入金登録権限がありません' }, { status: 403 })
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

    // 送付済み状態のみ入金可能
    if (invoice.status !== 'sent') {
      return NextResponse.json({ error: '送付済み状態の請求書のみ入金登録できます' }, { status: 400 })
    }

    // 支払記録を作成
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        payment_type: 'receipt',
        invoice_id: id,
        amount: amount,
        payment_method: payment_method,
        reference_number: reference_number,
        notes: notes,
        payment_date: payment_date || new Date().toISOString().split('T')[0],
        organization_id: userData.organization_id,
        recorded_by: userData.id
      })
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      return NextResponse.json({ error: '入金登録に失敗しました' }, { status: 500 })
    }

    // 請求書の支払済み金額を更新
    const newPaidAmount = (invoice.paid_amount || 0) + amount
    const isPaid = newPaidAmount >= invoice.total_amount

    const { error: updateError } = await supabase
      .from('billing_invoices')
      .update({
        paid_amount: newPaidAmount,
        status: isPaid ? 'paid' : invoice.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Invoice update error:', updateError)
      // 支払記録は作成されているので、エラーは警告のみ
    }

    // 操作履歴を記録
    await supabase.from('invoice_history').insert({
      invoice_id: id,
      organization_id: userData.organization_id,
      action_type: isPaid ? 'paid' : 'payment_recorded',
      performed_by: userData.id,
      performed_by_name: userData.name || 'Unknown',
      notes: `入金額: ¥${amount.toLocaleString()}${isPaid ? ' (完済)' : ' (一部入金)'}${notes ? `\n備考: ${notes}` : ''}`
    })

    // 監査ログを記録
    await logInvoiceUpdated(
      id,
      {
        paid_amount: invoice.paid_amount || 0,
        status: invoice.status,
      },
      {
        paid_amount: newPaidAmount,
        status: isPaid ? 'paid' : invoice.status,
        payment_amount: amount,
        payment_method: payment_method,
        is_paid: isPaid,
      }
    )

    // 完済時、作成者に通知を送信
    if (isPaid && invoice.created_by && invoice.created_by !== userData.id) {
      console.log('[PAYMENT] Sending notification to creator:', invoice.created_by)
      const { error: notificationError } = await supabase.from('notifications').insert({
        target_user_id: invoice.created_by,
        organization_id: userData.organization_id,
        type: 'estimate_approved', // 既存のタイプを使用
        title: '請求書が入金済みになりました',
        message: `請求書「${invoice.invoice_number}」の入金が完了しました。入金額: ¥${amount.toLocaleString()}`,
        metadata: {
          invoice_id: id,
          invoice_number: invoice.invoice_number,
          payment_amount: amount,
          recorded_by: userData.name || 'Unknown'
        }
      })

      if (notificationError) {
        console.error('[PAYMENT] Notification error:', notificationError)
      } else {
        console.log('[PAYMENT] Notification sent successfully')
      }
    }

    return NextResponse.json({
      success: true,
      payment: payment,
      isPaid: isPaid,
      newPaidAmount: newPaidAmount
    })
  } catch (error: any) {
    console.error('Payment registration error:', error)
    return NextResponse.json(
      { error: error.message || '入金登録に失敗しました' },
      { status: 500 }
    )
  }
}