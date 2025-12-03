'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function adjustConsumableInventory({
  consumableId,
  adjustmentType,
  quantity,
  reason,
}: {
  consumableId: string
  adjustmentType: 'add' | 'remove' | 'set'
  quantity: number
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
    .eq('organization_id', userData.organization_id)
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
        organization_id: userData.organization_id,
        tool_id: consumableId,
        location_type: 'warehouse',
        site_id: null,
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

  const { error: movementError } = await supabase
    .from('consumable_movements')
    .insert({
      organization_id: userData.organization_id,
      tool_id: consumableId,
      movement_type: '調整',
      from_location_type: 'warehouse',
      from_site_id: null,
      to_location_type: 'warehouse',
      to_site_id: null,
      quantity: quantity,
      performed_by: user.id,
      notes: `[${adjustmentTypeText}] ${reason}`,
    })

  if (movementError) {
    console.error('Movement record error:', movementError)
  }

  revalidatePath('/consumables')
  redirect('/consumables')
}
