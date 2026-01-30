'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

type ConsumableRegistrationData = {
  name: string
  model_number?: string
  manufacturer?: string
  unit: string
  minimum_stock: number
  initial_quantity: number
  description?: string
}

/**
 * 消耗品マスターを登録（Server Action）
 * セキュリティ: HTMLエスケープ + 不審なパターン検出
 */
export async function createConsumableMaster(data: ConsumableRegistrationData) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { error: 'ユーザー情報が取得できません' }
  }

  // バリデーション
  if (!data.name || data.name.trim() === '') {
    return { error: '消耗品名を入力してください' }
  }

  if (data.minimum_stock < 0) {
    return { error: '最小在庫数は0以上で入力してください' }
  }

  if (data.initial_quantity < 0) {
    return { error: '初期在庫数は0以上で入力してください' }
  }

  // 不審なパターン検出
  if (hasSuspiciousPattern(data.name)) {
    return { error: '消耗品名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' }
  }

  if (data.model_number && hasSuspiciousPattern(data.model_number)) {
    return { error: '型番に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' }
  }

  if (data.manufacturer && hasSuspiciousPattern(data.manufacturer)) {
    return { error: 'メーカー名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' }
  }

  if (data.description && hasSuspiciousPattern(data.description)) {
    return { error: '説明・備考に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' }
  }

  // 消耗品カテゴリIDを取得
  const { data: consumableCategory } = await supabase
    .from('categories')
    .select('id')
    .eq('organization_id', userData.organization_id)
    .eq('name', '消耗品')
    .single()

  // HTMLエスケープ処理
  const sanitizedData = {
    organization_id: userData.organization_id,
    name: escapeHtml(data.name.trim()),
    model_number: data.model_number ? escapeHtml(data.model_number.trim()) : null,
    manufacturer: data.manufacturer ? escapeHtml(data.manufacturer.trim()) : null,
    category_id: consumableCategory?.id || null,
    management_type: 'consumable' as const,
    unit: escapeHtml(data.unit),
    minimum_stock: data.minimum_stock,
    notes: data.description ? escapeHtml(data.description.trim()) : null,
  }

  // 消耗品マスターを作成
  const { data: newConsumable, error: insertError } = await supabase
    .from('tools')
    .insert(sanitizedData)
    .select()
    .single()

  if (insertError) {
    console.error('消耗品登録エラー:', insertError)
    return { error: `消耗品の登録に失敗しました: ${insertError.message}` }
  }

  // 初期在庫がある場合は在庫レコードを作成
  if (data.initial_quantity > 0) {
    const { error: inventoryError } = await supabase
      .from('consumable_inventory')
      .insert({
        organization_id: userData.organization_id,
        tool_id: newConsumable.id,
        location_type: 'warehouse',
        site_id: null,
        warehouse_location_id: null,
        quantity: data.initial_quantity,
      })

    if (inventoryError) {
      console.error('初期在庫の登録エラー:', inventoryError)
      // 在庫登録失敗でも消耗品マスターは作成済みなので警告のみ
      return {
        warning: '消耗品は登録されましたが、初期在庫の登録に失敗しました。後ほど在庫調整で追加してください。',
        consumable_id: newConsumable.id,
      }
    }

    // 在庫調整履歴を記録
    const { error: movementError } = await supabase
      .from('consumable_movements')
      .insert({
        organization_id: userData.organization_id,
        tool_id: newConsumable.id,
        movement_type: '調整',
        from_location_type: 'warehouse',
        from_site_id: null,
        to_location_type: 'warehouse',
        to_site_id: null,
        quantity: data.initial_quantity,
        performed_by: user.id,
        notes: escapeHtml('[初期在庫] 新規登録時の初期在庫'),
      })

    if (movementError) {
      console.error('在庫調整履歴の記録エラー:', movementError)
    }
  }

  revalidatePath('/consumables')
  return { success: true, consumable_id: newConsumable.id }
}
