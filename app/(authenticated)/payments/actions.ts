'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

export async function createPayment(paymentData: any) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // ユーザーの組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'ユーザー情報が見つかりません' }
  }

  // 管理者・マネージャーのみ実行可能
  if (!['admin', 'super_admin', 'manager'].includes(userData.role)) {
    return { success: false, error: '入金/出金登録の権限がありません' }
  }

  try {
    // 不審なパターン検出
    const textFields = [
      { field: 'reference_number', value: paymentData.reference_number, label: '参照番号' },
      { field: 'notes', value: paymentData.notes, label: '備考' },
    ]

    for (const { value, label } of textFields) {
      if (value && hasSuspiciousPattern(value)) {
        return { success: false, error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` }
      }
    }

    // HTMLエスケープ処理
    const sanitizedData = {
      payment_date: paymentData.payment_date,
      payment_type: paymentData.payment_type,
      invoice_id: paymentData.invoice_id || null,
      purchase_order_id: paymentData.purchase_order_id || null,
      amount: paymentData.amount,
      payment_method: paymentData.payment_method,
      reference_number: paymentData.reference_number ? escapeHtml(paymentData.reference_number) : null,
      notes: paymentData.notes ? escapeHtml(paymentData.notes) : null,
      organization_id: userData.organization_id,
      recorded_by: user.id,
    }

    // 支払記録を作成
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert(sanitizedData)
      .select()
      .single()

    if (paymentError) {
      console.error('Payment creation error:', paymentError)
      throw paymentError
    }

    // 請求書または発注書の支払済み金額を更新
    if (paymentData.payment_type === 'receipt' && paymentData.invoice_id) {
      // 請求書データを取得
      const { data: invoice } = await supabase
        .from('billing_invoices')
        .select('paid_amount, total_amount, status')
        .eq('id', paymentData.invoice_id)
        .single()

      if (invoice) {
        const newPaidAmount = (invoice.paid_amount || 0) + paymentData.amount
        const isPaid = newPaidAmount >= invoice.total_amount

        await supabase
          .from('billing_invoices')
          .update({
            paid_amount: newPaidAmount,
            status: isPaid ? 'paid' : invoice.status
          })
          .eq('id', paymentData.invoice_id)
      }
    } else if (paymentData.payment_type === 'payment' && paymentData.purchase_order_id) {
      // 発注書データを取得
      const { data: purchaseOrder } = await supabase
        .from('purchase_orders')
        .select('paid_amount, total_amount, status')
        .eq('id', paymentData.purchase_order_id)
        .single()

      if (purchaseOrder) {
        const newPaidAmount = (purchaseOrder.paid_amount || 0) + paymentData.amount
        const isPaid = newPaidAmount >= purchaseOrder.total_amount

        await supabase
          .from('purchase_orders')
          .update({
            paid_amount: newPaidAmount,
            status: isPaid ? 'paid' : purchaseOrder.status
          })
          .eq('id', paymentData.purchase_order_id)
      }
    }

    // キャッシュを再検証
    revalidatePath('/payments')

    return { success: true, data: payment }
  } catch (error: any) {
    console.error('入金/出金登録エラー:', error)
    return { success: false, error: error.message || '入金/出金登録に失敗しました' }
  }
}
