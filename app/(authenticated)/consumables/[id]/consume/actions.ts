'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logConsumableUpdated } from '@/lib/audit-log'

export async function consumeConsumable({
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

  if (inventory.quantity < quantity) {
    throw new Error(`在庫が不足しています（在庫: ${inventory.quantity}、消費: ${quantity}）`)
  }

  // 在庫を減らす
  const newQuantity = inventory.quantity - quantity

  if (newQuantity === 0) {
    // 在庫が0になる場合は削除
    const { error: deleteError } = await supabase
      .from('consumable_inventory')
      .delete()
      .eq('id', inventoryId)

    if (deleteError) {
      throw new Error('在庫削除に失敗しました: ' + deleteError.message)
    }
  } else {
    // 在庫を更新
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
  }

  // 消費履歴を記録
  const { error: movementError } = await supabase
    .from('consumable_movements')
    .insert({
      organization_id: userData.organization_id,
      tool_id: consumableId,
      movement_type: '消費',
      from_location_type: inventory.location_type,
      from_site_id: inventory.site_id,
      from_location_id: inventory.location_type === 'warehouse' ? inventory.warehouse_location_id : inventory.site_id,
      to_location_type: null,
      to_site_id: null,
      to_location_id: null,
      quantity: quantity,
      performed_by: user.id,
      notes: `${locationText}で消費`,
    })

  if (movementError) {
    throw new Error('消費履歴の記録に失敗しました: ' + movementError.message)
  }

  // 監査ログを記録
  await logConsumableUpdated(
    consumableId,
    { quantity: inventory.quantity },
    {
      quantity: newQuantity,
      action: 'consume',
      consumed_quantity: quantity,
      location: locationText
    },
    user.id,
    userData.organization_id
  )

  revalidatePath(`/consumables/${consumableId}`)

  return { success: true }
}
