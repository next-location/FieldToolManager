import { createClient } from '@/lib/supabase/server'

export type InvoiceActionType =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'returned'
  | 'sent'
  | 'pdf_generated'
  | 'payment_recorded'
  | 'payment_completed'

interface CreateHistoryParams {
  invoiceId: string
  organizationId: string
  actionType: InvoiceActionType
  performedBy: string
  performedByName: string
  notes?: string
}

/**
 * 請求書操作履歴を記録
 */
export async function createInvoiceHistory({
  invoiceId,
  organizationId,
  actionType,
  performedBy,
  performedByName,
  notes,
}: CreateHistoryParams) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('invoice_history')
    .insert({
      invoice_id: invoiceId,
      organization_id: organizationId,
      action_type: actionType,
      performed_by: performedBy,
      performed_by_name: performedByName,
      notes,
    })

  if (error) {
    console.error('Failed to create invoice history:', error)
  }
}

/**
 * 請求書の操作履歴を取得
 */
export async function getInvoiceHistory(invoiceId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoice_history')
    .select('*')
    .eq('invoice_id', invoiceId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch invoice history:', error)
    return []
  }

  return data || []
}

/**
 * アクション種別を日本語に変換
 */
export function getActionTypeLabel(actionType: InvoiceActionType): string {
  const labels: Record<InvoiceActionType, string> = {
    created: '作成',
    draft_saved: '下書き保存',
    submitted: '確定・提出',
    approved: '承認',
    returned: '差し戻し',
    sent: '顧客送付',
    pdf_generated: 'PDF出力',
    payment_recorded: '入金記録',
    payment_completed: '入金完了',
  }
  return labels[actionType] || actionType
}
