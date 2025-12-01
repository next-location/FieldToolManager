'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function moveConsumable(formData: FormData) {
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

  const consumableId = formData.get('consumableId') as string
  const direction = formData.get('direction') as 'to_site' | 'from_site'
  const siteId = formData.get('siteId') as string
  const trackingMode = formData.get('trackingMode') as
    | 'quantity'
    | 'simple'
    | 'none'
  const quantity = formData.get('quantity')
    ? parseInt(formData.get('quantity') as string)
    : null
  const notes = formData.get('notes') as string

  // 移動元と移動先を決定
  const fromLocation = direction === 'to_site' ? 'warehouse' : 'site'
  const toLocation = direction === 'to_site' ? 'site' : 'warehouse'
  const fromSiteId = direction === 'from_site' ? siteId : null
  const toSiteId = direction === 'to_site' ? siteId : null

  // quantity モードの場合は在庫を更新
  if (trackingMode === 'quantity' && quantity) {
    // 移動元の在庫を取得
    let sourceInventoryQuery = supabase
      .from('consumable_inventory')
      .select('*')
      .eq('tool_id', consumableId)
      .eq('organization_id', userData.organization_id)
      .eq('location_type', fromLocation)

    // site_idの条件を追加（NULLの場合は.is()を使用）
    if (fromSiteId) {
      sourceInventoryQuery = sourceInventoryQuery.eq('site_id', fromSiteId)
    } else {
      sourceInventoryQuery = sourceInventoryQuery.is('site_id', null)
    }

    const { data: sourceInventory } = await sourceInventoryQuery.single()

    if (!sourceInventory) {
      throw new Error('移動元の在庫が見つかりません')
    }

    if (sourceInventory.quantity < quantity) {
      throw new Error('移動元の在庫が不足しています')
    }

    // 移動先の在庫を取得
    let destInventoryQuery = supabase
      .from('consumable_inventory')
      .select('*')
      .eq('tool_id', consumableId)
      .eq('organization_id', userData.organization_id)
      .eq('location_type', toLocation)

    // site_idの条件を追加（NULLの場合は.is()を使用）
    if (toSiteId) {
      destInventoryQuery = destInventoryQuery.eq('site_id', toSiteId)
    } else {
      destInventoryQuery = destInventoryQuery.is('site_id', null)
    }

    const { data: destInventory } = await destInventoryQuery.single()

    // トランザクション的に更新
    // 移動元の在庫を減らす
    const newSourceQuantity = sourceInventory.quantity - quantity
    if (newSourceQuantity === 0) {
      // 在庫が0になる場合は削除
      const { error: deleteError } = await supabase
        .from('consumable_inventory')
        .delete()
        .eq('id', sourceInventory.id)

      if (deleteError) {
        throw new Error('移動元の在庫更新に失敗しました: ' + deleteError.message)
      }
    } else {
      const { error: updateError } = await supabase
        .from('consumable_inventory')
        .update({
          quantity: newSourceQuantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sourceInventory.id)

      if (updateError) {
        throw new Error('移動元の在庫更新に失敗しました: ' + updateError.message)
      }
    }

    // 移動先の在庫を増やす
    if (destInventory) {
      // 既存レコードを更新
      const { error: updateError } = await supabase
        .from('consumable_inventory')
        .update({
          quantity: destInventory.quantity + quantity,
          updated_at: new Date().toISOString(),
        })
        .eq('id', destInventory.id)

      if (updateError) {
        throw new Error('移動先の在庫更新に失敗しました: ' + updateError.message)
      }
    } else {
      // 新規レコード作成
      const { error: insertError } = await supabase
        .from('consumable_inventory')
        .insert({
          organization_id: userData.organization_id,
          tool_id: consumableId,
          location_type: toLocation,
          site_id: toSiteId,
          warehouse_location_id: null,
          quantity: quantity,
        })

      if (insertError) {
        throw new Error('移動先の在庫作成に失敗しました: ' + insertError.message)
      }
    }
  }

  // 移動履歴を記録（quantity と simple モードのみ）
  if (trackingMode !== 'none') {
    const { error: movementError } = await supabase
      .from('tool_movements')
      .insert({
        organization_id: userData.organization_id,
        tool_id: consumableId,
        tool_item_id: null,
        movement_type: direction === 'to_site' ? 'out' : 'return',
        from_location: fromLocation,
        to_location: toLocation,
        from_site_id: fromSiteId,
        to_site_id: toSiteId,
        quantity: 1, // 消耗品の場合は常に1
        consumable_quantity: trackingMode === 'quantity' ? quantity : null,
        performed_by: user.id,
        notes: notes || '',
      })

    if (movementError) {
      console.error('Movement record error:', movementError)
    }
  }

  revalidatePath('/consumables')
  redirect('/consumables')
}
