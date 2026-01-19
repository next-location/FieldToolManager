'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logConsumableUpdated } from '@/lib/audit-log'

export async function adjustConsumableInventory({
  consumableId,
  adjustmentType,
  quantity,
  unitPrice,
  reason,
}: {
  consumableId: string
  adjustmentType: 'add' | 'remove' | 'set'
  quantity: number
  unitPrice: number | null
  reason: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('ユーザーが見つかりません')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('組織情報が見つかりません')
  }

  // 倉庫在庫を取得
  const { data: inventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('tool_id', consumableId)
    .eq('organization_id', userData?.organization_id)
    .eq('location_type', 'warehouse')
    .single()

  let newQuantity: number

  switch (adjustmentType) {
    case 'add':
      newQuantity = (inventory?.quantity || 0) + quantity
      break
    case 'remove':
      newQuantity = Math.max(0, (inventory?.quantity || 0) - quantity)
      break
    case 'set':
      newQuantity = quantity
      break
    default:
      throw new Error('無効な調整タイプです')
  }

  if (inventory) {
    // 既存レコードを更新
    const { error } = await supabase
      .from('consumable_inventory')
      .update({
        quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inventory.id)

    if (error) {
      throw new Error('在庫更新に失敗しました: ' + error.message)
    }
  } else {
    // 新規レコード作成
    const { error } = await supabase
      .from('consumable_inventory')
      .insert({
        organization_id: userData?.organization_id,
        tool_id: consumableId,
        location_type: 'warehouse',
        site_id: null,
        location_id: null, // 新カラム（倉庫の場合はnull、後で自社倉庫IDに変更予定）
        warehouse_location_id: null,
        quantity: newQuantity,
      })

    if (error) {
      throw new Error('在庫作成に失敗しました: ' + error.message)
    }
  }

  // 調整履歴を記録（consumable_movementsに記録）
  const adjustmentTypeText =
    adjustmentType === 'add'
      ? '追加'
      : adjustmentType === 'remove'
        ? '削減'
        : '設定'

  const totalAmount = unitPrice !== null ? quantity * unitPrice : null

  const { error: movementError } = await supabase
    .from('consumable_movements')
    .insert({
      organization_id: userData?.organization_id,
      tool_id: consumableId,
      movement_type: '調整',
      from_location_type: 'warehouse', // 旧カラム
      from_site_id: null, // 旧カラム
      from_location_id: null, // 新カラム（倉庫）
      to_location_type: 'warehouse', // 旧カラム
      to_site_id: null, // 旧カラム
      to_location_id: null, // 新カラム（倉庫）
      quantity: quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      performed_by: user.id,
      notes: `[${adjustmentTypeText}] ${reason}`,
    })

  if (movementError) {
    console.error('Movement record error:', movementError)
  }

  // 監査ログを記録
  await logConsumableUpdated(
    consumableId,
    { quantity: inventory?.quantity || 0 },
    {
      quantity: newQuantity,
      action: 'adjust',
      adjustment_type: adjustmentType,
      adjustment_quantity: quantity,
      unit_price: unitPrice,
      total_amount: totalAmount,
      reason: reason
    }
  )

  revalidatePath('/consumables')
  redirect('/consumables')
}
