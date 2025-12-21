import { createClient } from '@/lib/supabase/server'

export type EstimateActionType =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'approval_cancelled'
  | 'returned'
  | 'sent'
  | 'pdf_generated'
  | 'accepted'
  | 'rejected'
  | 'customer_approved'
  | 'customer_rejected'
  | 'expired'

interface CreateHistoryParams {
  estimateId: string
  organizationId: string
  actionType: EstimateActionType
  performedBy: string
  performedByName: string
  notes?: string
}

/**
 * 見積もり操作履歴を記録
 */
export async function createEstimateHistory({
  estimateId,
  organizationId,
  actionType,
  performedBy,
  performedByName,
  notes,
}: CreateHistoryParams) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('estimate_history')
    .insert({
      estimate_id: estimateId,
      organization_id: organizationId,
      action_type: actionType,
      performed_by: performedBy,
      performed_by_name: performedByName,
      notes,
    })

  if (error) {
    console.error('Failed to create estimate history:', error)
  }
}

/**
 * 見積もりの操作履歴を取得
 */
export async function getEstimateHistory(estimateId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('estimate_history')
    .select('*')
    .eq('estimate_id', estimateId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch estimate history:', error)
    return []
  }

  return data || []
}

/**
 * アクション種別を日本語に変換
 */
export function getActionTypeLabel(actionType: EstimateActionType): string {
  const labels: Record<EstimateActionType, string> = {
    created: '作成',
    draft_saved: '下書き保存',
    submitted: '確定・提出',
    approved: '承認',
    approval_cancelled: '承認取消',
    returned: '差し戻し',
    sent: '顧客送付',
    pdf_generated: 'PDF出力',
    accepted: '受理',
    rejected: '却下',
    customer_approved: '顧客承認',
    customer_rejected: '顧客却下',
    expired: '有効期限切れ',
  }
  return labels[actionType] || actionType
}
