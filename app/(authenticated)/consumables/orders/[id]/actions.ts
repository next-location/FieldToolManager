'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logConsumableUpdated } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

export async function markAsOrdered(orderId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('consumable_orders')
    .update({
      status: '発注済み',
    })
    .eq('id', orderId)

  if (error) {
    throw new Error(`ステータス更新に失敗しました: ${error.message}`)
  }

  revalidatePath(`/consumables/orders/${orderId}`)
  revalidatePath('/consumables/orders')
}

export async function markAsDelivered(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const orderId = formData.get('order_id') as string
  const userId = formData.get('user_id') as string
  const actualDeliveryDate = formData.get('actual_delivery_date') as string
  const deliveryNotes = formData.get('delivery_notes') as string

  // 発注情報を取得
  const { data: order, error: fetchError } = await supabase
    .from('consumable_orders')
    .select('*, tools:tool_id(*)')
    .eq('id', orderId)
    .single()

  if (fetchError || !order) {
    throw new Error('発注情報の取得に失敗しました')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報が見つかりません')
  }

  // 不審なパターン検出
  if (deliveryNotes && hasSuspiciousPattern(deliveryNotes)) {
    throw new Error('納品メモに不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
  }

  // HTMLエスケープ処理
  const sanitizedDeliveryNotes = deliveryNotes ? escapeHtml(deliveryNotes) : null

  // トランザクション的な処理を実行
  // 1. 発注ステータスを納品済みに更新
  const { error: updateError } = await supabase
    .from('consumable_orders')
    .update({
      status: '納品済み',
      actual_delivery_date: actualDeliveryDate,
      received_by: userId,
      notes: sanitizedDeliveryNotes
        ? `${order.notes ? order.notes + '\n\n' : ''}【納品メモ】\n${sanitizedDeliveryNotes}`
        : order.notes,
    })
    .eq('id', orderId)

  if (updateError) {
    throw new Error(`ステータス更新に失敗しました: ${updateError.message}`)
  }

  // 2. 倉庫在庫を更新（location_type='warehouse', site_id=NULL）
  const { data: existingInventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .eq('tool_id', order.tool_id)
    .eq('location_type', 'warehouse')
    .is('site_id', null)
    .is('warehouse_location_id', null)
    .single()

  if (existingInventory) {
    // 既存在庫に追加
    const { error: inventoryError } = await supabase
      .from('consumable_inventory')
      .update({
        quantity: existingInventory.quantity + order.quantity,
      })
      .eq('id', existingInventory.id)

    if (inventoryError) {
      throw new Error(`在庫更新に失敗しました: ${inventoryError.message}`)
    }
  } else {
    // 新規在庫レコード作成
    const { error: inventoryError } = await supabase
      .from('consumable_inventory')
      .insert({
        organization_id: userData?.organization_id,
        tool_id: order.tool_id,
        location_type: 'warehouse',
        quantity: order.quantity,
      })

    if (inventoryError) {
      throw new Error(`在庫作成に失敗しました: ${inventoryError.message}`)
    }
  }

  // 3. 移動履歴を記録（調整として記録 - 外部からの入庫）
  const { error: movementError } = await supabase
    .from('consumable_movements')
    .insert({
      organization_id: userData?.organization_id,
      tool_id: order.tool_id,
      movement_type: '調整',
      to_location_type: 'warehouse',
      quantity: order.quantity,
      notes: `【入庫】発注番号: ${order.order_number} の納品による入庫${deliveryNotes ? `\n${deliveryNotes}` : ''}`,
      performed_by: userId,
    })

  if (movementError) {
    throw new Error(`移動履歴の作成に失敗しました: ${movementError.message}`)
  }

  // 監査ログを記録（入庫による在庫増加）
  await logConsumableUpdated(
    order.tool_id,
    { quantity: existingInventory?.quantity || 0 },
    {
      quantity: (existingInventory?.quantity || 0) + order.quantity,
      action: 'delivery',
      order_number: order.order_number,
      delivered_quantity: order.quantity,
      delivery_date: actualDeliveryDate,
      notes: deliveryNotes
    },
    user.id,
    userData.organization_id
  )

  revalidatePath(`/consumables/orders/${orderId}`)
  revalidatePath('/consumables/orders')
  revalidatePath('/consumables')
}

export async function markAsCancelled(orderId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { error } = await supabase
    .from('consumable_orders')
    .update({
      status: 'キャンセル',
    })
    .eq('id', orderId)

  if (error) {
    throw new Error(`キャンセル処理に失敗しました: ${error.message}`)
  }

  revalidatePath(`/consumables/orders/${orderId}`)
  revalidatePath('/consumables/orders')
}
