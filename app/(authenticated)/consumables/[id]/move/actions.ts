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
  const fromType = formData.get('fromType') as 'warehouse' | 'site'
  const toType = formData.get('toType') as 'warehouse' | 'site'
  const fromSiteId = formData.get('fromSiteId') as string | null
  const toSiteId = formData.get('toSiteId') as string | null
  const fromWarehouseLocationId = formData.get('fromWarehouseLocationId') as string | null
  const toWarehouseLocationId = formData.get('toWarehouseLocationId') as string | null
  const trackingMode = formData.get('trackingMode') as 'quantity' | 'simple' | 'none'
  const quantity = formData.get('quantity')
    ? parseInt(formData.get('quantity') as string)
    : null
  const notes = formData.get('notes') as string

  // quantity モードの場合は在庫を更新
  if (trackingMode === 'quantity' && quantity) {
    // 移動元の在庫を取得
    let sourceInventoryQuery = supabase
      .from('consumable_inventory')
      .select('*')
      .eq('tool_id', consumableId)
      .eq('organization_id', userData?.organization_id)
      .eq('location_type', fromType)

    // 移動元の条件を追加
    if (fromType === 'site' && fromSiteId) {
      sourceInventoryQuery = sourceInventoryQuery.eq('site_id', fromSiteId)
    } else if (fromType === 'warehouse') {
      sourceInventoryQuery = sourceInventoryQuery.is('site_id', null)
      if (fromWarehouseLocationId) {
        sourceInventoryQuery = sourceInventoryQuery.eq('warehouse_location_id', fromWarehouseLocationId)
      } else {
        sourceInventoryQuery = sourceInventoryQuery.is('warehouse_location_id', null)
      }
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
      .eq('organization_id', userData?.organization_id)
      .eq('location_type', toType)

    // 移動先の条件を追加
    if (toType === 'site' && toSiteId) {
      destInventoryQuery = destInventoryQuery.eq('site_id', toSiteId)
    } else if (toType === 'warehouse') {
      destInventoryQuery = destInventoryQuery.is('site_id', null)
      if (toWarehouseLocationId) {
        destInventoryQuery = destInventoryQuery.eq('warehouse_location_id', toWarehouseLocationId)
      } else {
        destInventoryQuery = destInventoryQuery.is('warehouse_location_id', null)
      }
    }

    const { data: destInventory } = await destInventoryQuery.single()

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
          organization_id: userData?.organization_id,
          tool_id: consumableId,
          location_type: toType,
          site_id: toType === 'site' ? toSiteId : null,
          location_id: toType === 'site' ? toSiteId : null,
          warehouse_location_id: toType === 'warehouse' ? toWarehouseLocationId : null,
          quantity: quantity,
        })

      if (insertError) {
        throw new Error('移動先の在庫作成に失敗しました: ' + insertError.message)
      }
    }
  }

  // 消耗品移動履歴を記録
  if (trackingMode !== 'none') {
    const { error: movementError } = await supabase
      .from('consumable_movements')
      .insert({
        organization_id: userData?.organization_id,
        tool_id: consumableId,
        movement_type: '移動',
        from_location_type: fromType,
        from_site_id: fromType === 'site' ? fromSiteId : null,
        from_location_id: fromType === 'site' ? fromSiteId : null,
        to_location_type: toType,
        to_site_id: toType === 'site' ? toSiteId : null,
        to_location_id: toType === 'site' ? toSiteId : null,
        quantity: trackingMode === 'quantity' ? quantity : 1,
        performed_by: user.id,
        notes: notes || null,
      })

    if (movementError) {
      console.error('Movement record error:', movementError)
      throw new Error('移動履歴の記録に失敗しました: ' + movementError.message)
    }
  }

  revalidatePath('/consumables')
  redirect('/consumables')
}
