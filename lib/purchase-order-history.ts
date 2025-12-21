import { createClient, createAdminClient } from '@/lib/supabase/server'

export type PurchaseOrderActionType =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'ordered'
  | 'received'
  | 'paid'
  | 'pdf_generated'

interface CreateHistoryParams {
  purchaseOrderId: string
  organizationId: string
  actionType: PurchaseOrderActionType
  performedBy: string
  performedByName: string
  notes?: string
}

/**
 * 発注書操作履歴を記録
 */
export async function createPurchaseOrderHistory({
  purchaseOrderId,
  organizationId,
  actionType,
  performedBy,
  performedByName,
  notes,
}: CreateHistoryParams) {
  console.log('[PURCHASE ORDER HISTORY] ===== 履歴記録開始 =====')
  console.log('[PURCHASE ORDER HISTORY] purchaseOrderId:', purchaseOrderId)
  console.log('[PURCHASE ORDER HISTORY] organizationId:', organizationId)
  console.log('[PURCHASE ORDER HISTORY] actionType:', actionType)
  console.log('[PURCHASE ORDER HISTORY] performedBy:', performedBy)
  console.log('[PURCHASE ORDER HISTORY] performedByName:', performedByName)
  console.log('[PURCHASE ORDER HISTORY] notes:', notes)

  // サーバーサイドからの呼び出しなのでRLSをバイパスするadminClientを使用
  const supabase = createAdminClient()

  console.log('[PURCHASE ORDER HISTORY] Admin client作成完了')

  const insertData = {
    purchase_order_id: purchaseOrderId,
    organization_id: organizationId,
    action: actionType, // 古いカラムとの互換性のため
    action_type: actionType,
    performed_by: performedBy,
    performed_by_name: performedByName,
    notes,
    comment: notes, // 古いカラムとの互換性のため
    created_by: performedBy, // 古いカラムとの互換性のため
  }

  console.log('[PURCHASE ORDER HISTORY] 挿入データ:', JSON.stringify(insertData, null, 2))

  const { data, error } = await supabase
    .from('purchase_order_history')
    .insert(insertData)
    .select()

  if (error) {
    console.error('[PURCHASE ORDER HISTORY] ===== エラー発生 =====')
    console.error('[PURCHASE ORDER HISTORY] ERROR CODE:', error.code)
    console.error('[PURCHASE ORDER HISTORY] ERROR MESSAGE:', error.message)
    console.error('[PURCHASE ORDER HISTORY] ERROR DETAILS:', error.details)
    console.error('[PURCHASE ORDER HISTORY] ERROR HINT:', error.hint)
  } else {
    console.log('[PURCHASE ORDER HISTORY] ===== 履歴記録成功 =====')
    console.log('[PURCHASE ORDER HISTORY] 挿入されたデータ:', data)
  }
}

/**
 * 発注書の操作履歴を取得
 */
export async function getPurchaseOrderHistory(purchaseOrderId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_order_history')
    .select('*')
    .eq('purchase_order_id', purchaseOrderId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch purchase order history:', error)
    return []
  }

  return data || []
}

/**
 * アクション種別を日本語に変換
 */
export function getActionTypeLabel(actionType: PurchaseOrderActionType): string {
  const labels: Record<PurchaseOrderActionType, string> = {
    created: '作成',
    draft_saved: '下書き保存',
    submitted: '確定・提出',
    approved: '承認',
    rejected: '差し戻し',
    sent: '送付',
    ordered: '発注',
    received: '受領',
    paid: '支払い',
    pdf_generated: 'PDF出力',
  }
  return labels[actionType] || actionType
}
