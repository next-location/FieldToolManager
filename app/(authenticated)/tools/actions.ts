'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logToolCreated, logToolUpdated, logToolDeleted } from '@/lib/audit-log'
import { notifyToolCreated, notifyLowStock } from '@/lib/notification'

export async function createTool(formData: {
  name: string
  model_number?: string
  manufacturer?: string
  purchase_date?: string
  purchase_price?: string
  quantity: string
  minimum_stock: string
  notes?: string
}) {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'ユーザーが見つかりません' }
  }

  // ユーザーの組織IDを取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    console.error('User fetch error:', userError)
    return { error: '組織情報が見つかりません: ' + (userError?.message || 'データなし') }
  }

  // 道具マスタを登録
  const { data: toolData, error: insertError } = await supabase
    .from('tools')
    .insert({
      organization_id: userData?.organization_id,
      name: formData.name,
      model_number: formData.model_number || null,
      manufacturer: formData.manufacturer || null,
      purchase_date: formData.purchase_date || null,
      purchase_price: formData.purchase_price
        ? parseFloat(formData.purchase_price)
        : null,
      quantity: parseInt(formData.quantity),
      minimum_stock: parseInt(formData.minimum_stock),
      notes: formData.notes || null,
      current_location: 'warehouse',
      status: 'available',
    })
    .select()
    .single()

  if (insertError || !toolData) {
    console.error('Insert error:', insertError)
    return { error: '登録に失敗しました: ' + (insertError?.message || '不明なエラー') }
  }

  // 指定された数量分の個別アイテムを作成
  const quantity = parseInt(formData.quantity)
  const toolItems = []

  for (let i = 1; i <= quantity; i++) {
    toolItems.push({
      tool_id: toolData.id,
      organization_id: userData?.organization_id,
      serial_number: String(i).padStart(5, '0'), // "00001", "00002", "00003"...
      current_location: 'warehouse',
      status: 'available',
      notes: null,
    })
  }

  const { error: itemsError } = await supabase
    .from('tool_items')
    .insert(toolItems)

  if (itemsError) {
    console.error('Tool items insert error:', itemsError)
    // 道具マスタは既に作成されているので、エラーを返すが続行
    return {
      error: '個別アイテムの作成に失敗しました: ' + itemsError.message,
    }
  }

  // 監査ログを記録
  await logToolCreated(toolData.id, {
    name: toolData.name,
    model_number: toolData.model_number,
    manufacturer: toolData.manufacturer,
    quantity: toolData.quantity,
    minimum_stock: toolData.minimum_stock,
  })

  // 通知を作成
  await notifyToolCreated(toolData.id, toolData.name)

  // 低在庫チェック
  if (toolData.quantity < toolData.minimum_stock) {
    await notifyLowStock(
      toolData.id,
      toolData.name,
      toolData.quantity,
      toolData.minimum_stock
    )
  }

  revalidatePath('/tools')
  return { success: true }
}

export async function updateTool(
  toolId: string,
  formData: {
    name: string
    model_number?: string
    manufacturer?: string
    purchase_date?: string
    purchase_price?: string
    quantity: string
    minimum_stock: string
    enable_low_stock_alert?: boolean
    warranty_expiration_date?: string
    notes?: string
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'ユーザーが見つかりません' }
  }

  // 更新前のデータを取得（監査ログ用）
  const { data: oldData } = await supabase
    .from('tools')
    .select('*')
    .eq('id', toolId)
    .single()

  const { error: updateError } = await supabase
    .from('tools')
    .update({
      name: formData.name,
      model_number: formData.model_number || null,
      manufacturer: formData.manufacturer || null,
      purchase_date: formData.purchase_date || null,
      purchase_price: formData.purchase_price
        ? parseFloat(formData.purchase_price)
        : null,
      quantity: parseInt(formData.quantity),
      minimum_stock: parseInt(formData.minimum_stock),
      warranty_expiration_date: formData.warranty_expiration_date || null,
      notes: formData.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', toolId)

  if (updateError) {
    console.error('Update error:', updateError)
    return { error: '更新に失敗しました: ' + updateError.message }
  }

  // 新しいデータを構築
  const newData = {
    name: formData.name,
    model_number: formData.model_number || null,
    manufacturer: formData.manufacturer || null,
    purchase_date: formData.purchase_date || null,
    purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
    quantity: parseInt(formData.quantity),
    minimum_stock: parseInt(formData.minimum_stock),
    warranty_expiration_date: formData.warranty_expiration_date || null,
    notes: formData.notes || null,
  }

  // 監査ログを記録
  if (oldData) {
    await logToolUpdated(toolId, oldData, newData)
  }

  // 低在庫チェック
  const quantity = parseInt(formData.quantity)
  const minimumStock = parseInt(formData.minimum_stock)

  if (quantity < minimumStock) {
    await notifyLowStock(toolId, formData.name, quantity, minimumStock)
  }

  revalidatePath('/tools')
  revalidatePath(`/tools/${toolId}`)
  return { success: true }
}

/**
 * 道具を削除（論理削除）
 *
 * 重要: この関数は通常のRLSポリシーではなく、ストアドプロシージャ（delete_tool）を使用しています。
 *
 * 理由:
 * - RLSポリシーのWITH CHECK句とUPDATE操作の競合により、
 *   deleted_atフィールドを設定する際にRLSエラーが発生する問題を回避するため
 * - ストアドプロシージャ内で組織IDのチェックを行い、セキュリティを保証
 * - SECURITY DEFINERにより、RLSを回避して確実に削除を実行
 *
 * セキュリティ:
 * - delete_tool()関数内で、ユーザーの組織IDと道具の組織IDの一致を確認
 * - 権限のない削除は関数内でエラーを返す
 *
 * 詳細: docs/ARCHITECTURE.md の「4.3 ストアドプロシージャによるデータ操作」を参照
 */
export async function deleteTool(toolId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'ユーザーが見つかりません' }
  }

  // RLS問題回避のため、ストアドプロシージャを使用して削除
  const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_tool', {
    tool_id: toolId
  })

  if (deleteError) {
    console.error('Delete RPC error:', deleteError)
    return { error: '削除に失敗しました: ' + deleteError.message }
  }

  if (deleteResult && deleteResult.error) {
    return { error: deleteResult.error }
  }

  revalidatePath('/tools')
  return { success: true }
}

/**
 * 道具マスタ + 個別アイテムを登録
 *
 * モード1: 既存の道具マスタから登録
 *   - tool_master_id を指定
 *   - 個別アイテムのみを作成
 *
 * モード2: 新規道具マスタ作成 + 個別アイテム登録
 *   - name, model_number, manufacturer, minimum_stock を指定
 *   - 道具マスタを作成してから個別アイテムを作成
 */
export async function createToolWithItems(formData: {
  // プリセット選択時
  preset_id?: string
  // 既存マスタ選択時
  tool_master_id?: string
  // 新規マスタ作成時
  name?: string
  model_number?: string
  manufacturer?: string
  management_type?: 'individual' | 'consumable'
  unit?: string
  minimum_stock?: string
  enable_low_stock_alert?: boolean
  image_url?: string | null
  warranty_expiration_date?: string
  // 共通（個別アイテム登録情報）
  quantity: string
  purchase_date?: string
  purchase_price?: string
  notes?: string
}) {
  const supabase = await createClient()

  // 現在のユーザーを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'ユーザーが見つかりません' }
  }

  // ユーザーの組織IDを取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    console.error('User fetch error:', userError)
    return { error: '組織情報が見つかりません: ' + (userError?.message || 'データなし') }
  }

  let toolId: string
  let toolData: any

  // モード0: プリセットから登録（プリセットをコピーして組織マスタ作成 → 個別アイテム登録）
  if (formData.preset_id) {
    // ストアドプロシージャでプリセットから組織マスタを作成
    const { data: newToolId, error: copyError } = await supabase.rpc(
      'copy_preset_to_organization',
      {
        p_preset_id: formData.preset_id,
        p_organization_id: userData?.organization_id,
      }
    )

    if (copyError || !newToolId) {
      console.error('Preset copy error:', copyError)
      return { error: 'プリセットのコピーに失敗しました: ' + (copyError?.message || '') }
    }

    // 作成された道具マスタを取得
    const { data: createdTool, error: toolError } = await supabase
      .from('tools')
      .select('*')
      .eq('id', newToolId)
      .single()

    if (toolError || !createdTool) {
      console.error('Created tool fetch error:', toolError)
      return { error: '作成された道具マスタの取得に失敗しました' }
    }

    toolId = newToolId
    toolData = createdTool

  } else if (formData.tool_master_id) {
    // モード1: 既存マスタから登録
    console.log('[createToolWithItems] モード1: 既存マスタから登録, tool_master_id:', formData.tool_master_id)

    // 既存マスタの情報を取得
    const { data: existingTool, error: toolError } = await supabase
      .from('tools')
      .select('*')
      .eq('id', formData.tool_master_id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (toolError || !existingTool) {
      console.error('Tool fetch error:', toolError)
      return { error: '指定された道具マスタが見つかりません' }
    }

    console.log('[createToolWithItems] 既存マスタ取得成功:', existingTool.name)

    toolId = existingTool.id
    toolData = existingTool

    console.log('[createToolWithItems] 個別アイテム作成へ（quantityは最後に実数から計算）')

  } else {
    // モード2: 新規マスタ作成
    if (!formData.name) {
      return { error: '道具名は必須です' }
    }

    const { data: newTool, error: insertError } = await supabase
      .from('tools')
      .insert({
        organization_id: userData?.organization_id,
        name: formData.name,
        model_number: formData.model_number || null,
        manufacturer: formData.manufacturer || null,
        management_type: formData.management_type || 'individual',
        unit: formData.unit || '個',
        quantity: parseInt(formData.quantity),
        minimum_stock: formData.minimum_stock ? parseInt(formData.minimum_stock) : 1,
        image_url: formData.image_url || null,
        warranty_expiration_date: formData.warranty_expiration_date || null,
      })
      .select()
      .single()

    if (insertError || !newTool) {
      console.error('Tool insert error:', insertError)
      return { error: '道具マスタの登録に失敗しました: ' + (insertError?.message || '不明なエラー') }
    }

    toolId = newTool.id
    toolData = newTool
  }

  // 管理タイプによって処理を分岐
  if (toolData.management_type === 'consumable') {
    // 消耗品管理: 在庫レコードを作成
    const quantity = parseInt(formData.quantity)
    const { error: inventoryError } = await supabase
      .from('consumable_inventory')
      .insert({
        organization_id: userData?.organization_id,
        tool_id: toolId,
        location_type: 'warehouse',
        site_id: null,
        warehouse_location_id: null,
        quantity: quantity,
      })

    if (inventoryError) {
      console.error('Consumable inventory insert error:', inventoryError)
      return {
        error: '在庫レコードの作成に失敗しました: ' + inventoryError.message,
      }
    }
  } else {
    // 個別管理: 個別アイテムを作成
    console.log('[createToolWithItems] 個別アイテム作成開始, tool_id:', toolId)

    // 既存の最大serial_numberを取得
    const { data: existingItems } = await supabase
      .from('tool_items')
      .select('serial_number')
      .eq('tool_id', toolId)
      .is('deleted_at', null)
      .order('serial_number', { ascending: false })
      .limit(1)

    let startNumber = 1
    if (existingItems && existingItems.length > 0) {
      const lastSerial = existingItems[0].serial_number
      startNumber = parseInt(lastSerial) + 1
      console.log('[createToolWithItems] 既存アイテムあり、最終シリアル:', lastSerial, '開始番号:', startNumber)
    } else {
      console.log('[createToolWithItems] 既存アイテムなし、開始番号:', startNumber)
    }

    const quantity = parseInt(formData.quantity)
    console.log('[createToolWithItems] 作成する個別アイテム数:', quantity)

    const toolItems = []

    for (let i = 0; i < quantity; i++) {
      toolItems.push({
        tool_id: toolId,
        organization_id: userData?.organization_id,
        serial_number: String(startNumber + i).padStart(5, '0'), // "00001", "00002", "00003"...
        current_location: 'warehouse',
        status: 'available',
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        notes: formData.notes || null,
      })
    }

    console.log('[createToolWithItems] 個別アイテム配列作成完了:', toolItems.map(item => item.serial_number).join(', '))

    const { error: itemsError } = await supabase
      .from('tool_items')
      .insert(toolItems)

    if (itemsError) {
      console.error('Tool items insert error:', itemsError)
      return {
        error: '個別アイテムの作成に失敗しました: ' + itemsError.message,
      }
    }

    console.log('[createToolWithItems] 個別アイテム登録成功')

    // 在庫調整履歴を記録
    const { error: movementError } = await supabase
      .from('tool_movements')
      .insert({
        organization_id: userData?.organization_id,
        tool_id: toolId,
        movement_type: 'adjustment',
        from_location: 'warehouse',
        to_location: 'warehouse',
        quantity: quantity,
        performed_by: user.id,
        notes: `個別アイテム追加: ${quantity}台登録`,
      })

    if (movementError) {
      console.error('Failed to record movement:', movementError)
    }

    // 個別アイテムの実数を数えてquantityを更新
    const { count: actualCount } = await supabase
      .from('tool_items')
      .select('*', { count: 'exact', head: true })
      .eq('tool_id', toolId)
      .is('deleted_at', null)

    console.log('[createToolWithItems] 個別アイテム実数:', actualCount)

    if (actualCount !== null) {
      const { error: updateError } = await supabase
        .from('tools')
        .update({
          quantity: actualCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', toolId)

      if (updateError) {
        console.error('Tool quantity update error:', updateError)
      } else {
        console.log('[createToolWithItems] 道具マスタのquantityを', actualCount, 'に更新しました')
      }
    }
  }

  revalidatePath('/tools')
  return { success: true }
}
