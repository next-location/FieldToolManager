'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addConsumableInventory({
  consumableId,
  inventoryId,
  quantity,
  locationText,
}: {
  consumableId: string
  inventoryId: string
  quantity: number
  locationText: string
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

  // 在庫を取得
  const { data: inventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('id', inventoryId)
    .eq('organization_id', userData.organization_id)
    .single()

  if (!inventory) {
    throw new Error('在庫が見つかりません')
  }

  // 在庫を増やす
  const newQuantity = inventory.quantity + quantity

  const { error: updateError } = await supabase
    .from('consumable_inventory')
    .update({
      quantity: newQuantity,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventoryId)

  if (updateError) {
    throw new Error('在庫更新に失敗しました: ' + updateError.message)
  }

  // 追加履歴を記録
  const { error: movementError } = await supabase
    .from('consumable_movements')
    .insert({
      organization_id: userData.organization_id,
      tool_id: consumableId,
      movement_type: '調整',
      from_location_type: inventory.location_type,
      from_site_id: inventory.site_id,
      from_location_id: inventory.location_type === 'warehouse' ? inventory.warehouse_location_id : inventory.site_id,
      to_location_type: inventory.location_type,
      to_site_id: inventory.site_id,
      to_location_id: inventory.location_type === 'warehouse' ? inventory.warehouse_location_id : inventory.site_id,
      quantity: quantity,
      performed_by: user.id,
      notes: `${locationText}で在庫追加（+${quantity}${inventory.unit || '個'}）`,
    })

  if (movementError) {
    throw new Error('追加履歴の記録に失敗しました: ' + movementError.message)
  }

  revalidatePath(`/consumables/${consumableId}`)

  return { success: true }
}
