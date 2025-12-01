'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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
      organization_id: userData.organization_id,
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
    return { error: '登録に失敗しました: ' + insertError.message }
  }

  // 指定された数量分の個別アイテムを作成
  const quantity = parseInt(formData.quantity)
  const toolItems = []

  for (let i = 1; i <= quantity; i++) {
    toolItems.push({
      tool_id: toolData.id,
      organization_id: userData.organization_id,
      serial_number: String(i).padStart(3, '0'), // "001", "002", "003"...
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
      notes: formData.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', toolId)

  if (updateError) {
    console.error('Update error:', updateError)
    return { error: '更新に失敗しました: ' + updateError.message }
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
  // 既存マスタ選択時
  tool_master_id?: string
  // 新規マスタ作成時
  name?: string
  model_number?: string
  manufacturer?: string
  minimum_stock?: string
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

  // モード1: 既存マスタから登録
  if (formData.tool_master_id) {
    // 既存マスタの情報を取得
    const { data: existingTool, error: toolError } = await supabase
      .from('tools')
      .select('*')
      .eq('id', formData.tool_master_id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (toolError || !existingTool) {
      console.error('Tool fetch error:', toolError)
      return { error: '指定された道具マスタが見つかりません' }
    }

    toolId = existingTool.id
    toolData = existingTool

    // quantityを更新（既存の個数 + 新規登録個数）
    const newTotalQuantity = (existingTool.quantity || 0) + parseInt(formData.quantity)
    const { error: updateError } = await supabase
      .from('tools')
      .update({
        quantity: newTotalQuantity,
        updated_at: new Date().toISOString()
      })
      .eq('id', toolId)

    if (updateError) {
      console.error('Tool quantity update error:', updateError)
      return { error: '道具マスタの個数更新に失敗しました: ' + updateError.message }
    }

  } else {
    // モード2: 新規マスタ作成
    if (!formData.name) {
      return { error: '道具名は必須です' }
    }

    const { data: newTool, error: insertError } = await supabase
      .from('tools')
      .insert({
        organization_id: userData.organization_id,
        name: formData.name,
        model_number: formData.model_number || null,
        manufacturer: formData.manufacturer || null,
        quantity: parseInt(formData.quantity),
        minimum_stock: formData.minimum_stock ? parseInt(formData.minimum_stock) : 1,
      })
      .select()
      .single()

    if (insertError || !newTool) {
      console.error('Tool insert error:', insertError)
      return { error: '道具マスタの登録に失敗しました: ' + insertError.message }
    }

    toolId = newTool.id
    toolData = newTool
  }

  // 個別アイテムを作成
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
  }

  const quantity = parseInt(formData.quantity)
  const toolItems = []

  for (let i = 0; i < quantity; i++) {
    toolItems.push({
      tool_id: toolId,
      organization_id: userData.organization_id,
      serial_number: String(startNumber + i).padStart(3, '0'), // "001", "002", "003"...
      current_location: 'warehouse',
      status: 'available',
      notes: formData.notes || null,
    })
  }

  const { error: itemsError } = await supabase
    .from('tool_items')
    .insert(toolItems)

  if (itemsError) {
    console.error('Tool items insert error:', itemsError)
    return {
      error: '個別アイテムの作成に失敗しました: ' + itemsError.message,
    }
  }

  revalidatePath('/tools')
  return { success: true }
}
