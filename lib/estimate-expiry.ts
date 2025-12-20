import { createClient } from '@/lib/supabase/server'
import { createEstimateHistory } from './estimate-history'

/**
 * 見積書の有効期限チェックと自動期限切れ処理
 * @param organizationId 組織ID
 * @returns 期限切れに更新した見積書の件数
 */
export async function checkAndUpdateExpiredEstimates(organizationId: string): Promise<number> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD形式

  // 期限切れ対象の見積書を取得
  const { data: expiredEstimates } = await supabase
    .from('estimates')
    .select('id, estimate_number, created_by, valid_until')
    .eq('organization_id', organizationId)
    .lt('valid_until', today) // 有効期限が今日より前
    .not('valid_until', 'is', null) // valid_untilがNULLでない
    .in('status', ['draft', 'submitted', 'sent']) // 顧客承認・却下以外
    .is('deleted_at', null)

  if (!expiredEstimates || expiredEstimates.length === 0) {
    return 0
  }

  // 各見積書を期限切れステータスに更新
  for (const estimate of expiredEstimates) {
    await supabase
      .from('estimates')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .eq('id', estimate.id)

    // 履歴記録
    await createEstimateHistory({
      estimateId: estimate.id,
      organizationId,
      actionType: 'expired',
      performedBy: 'system',
      performedByName: 'システム',
      notes: `有効期限切れにより自動更新（有効期限: ${estimate.valid_until}）`
    })
  }

  return expiredEstimates.length
}

/**
 * 個別の見積書が期限切れかチェック（クライアント側で使用）
 */
export function isEstimateExpired(validUntil: string | null, status: string): boolean {
  if (!validUntil) return false
  if (['accepted', 'rejected', 'expired'].includes(status)) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiryDate = new Date(validUntil)
  expiryDate.setHours(0, 0, 0, 0)

  return expiryDate < today
}
