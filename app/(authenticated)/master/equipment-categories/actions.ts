'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

/**
 * 重機カテゴリを作成
 */
export async function createEquipmentCategory(categoryData: {
  name: string
  code_prefix?: string
}) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // ユーザーの組織IDと権限取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'ユーザー情報が見つかりません' }
  }

  // 権限チェック（admin または manager のみ）
  if (!['admin', 'manager'].includes(userData.role)) {
    return { success: false, error: '権限がありません' }
  }

  // バリデーション
  if (!categoryData.name || !categoryData.name.trim()) {
    return { success: false, error: 'カテゴリ名を入力してください' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'name', value: categoryData.name, label: 'カテゴリ名' },
    { field: 'code_prefix', value: categoryData.code_prefix, label: 'コード接頭辞' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return {
        success: false,
        error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`,
      }
    }
  }

  try {
    // カテゴリ数を取得してsort_orderを決定
    const { count } = await supabase
      .from('heavy_equipment_categories')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)

    // HTMLエスケープ処理
    const sanitizedData = {
      organization_id: userData.organization_id,
      name: escapeHtml(categoryData.name.trim()),
      code_prefix: categoryData.code_prefix?.trim() ? escapeHtml(categoryData.code_prefix.trim()) : null,
      icon: null,
      sort_order: count || 0,
      is_active: true,
    }

    // カテゴリを挿入
    const { data, error } = await supabase
      .from('heavy_equipment_categories')
      .insert(sanitizedData)
      .select()
      .single()

    if (error) throw error

    // キャッシュを再検証
    revalidatePath('/master/equipment-categories')

    return { success: true, data }
  } catch (error: any) {
    console.error('カテゴリ作成エラー:', error)
    return {
      success: false,
      error: error.message || 'カテゴリの作成に失敗しました',
    }
  }
}

/**
 * 重機カテゴリを更新
 */
export async function updateEquipmentCategory(
  categoryId: string,
  categoryData: {
    name: string
    code_prefix?: string
  }
) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // ユーザーの組織IDと権限取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'ユーザー情報が見つかりません' }
  }

  // 権限チェック（admin または manager のみ）
  if (!['admin', 'manager'].includes(userData.role)) {
    return { success: false, error: '権限がありません' }
  }

  // バリデーション
  if (!categoryData.name || !categoryData.name.trim()) {
    return { success: false, error: 'カテゴリ名を入力してください' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'name', value: categoryData.name, label: 'カテゴリ名' },
    { field: 'code_prefix', value: categoryData.code_prefix, label: 'コード接頭辞' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return {
        success: false,
        error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`,
      }
    }
  }

  try {
    // カテゴリの所有者チェック
    const { data: existingCategory } = await supabase
      .from('heavy_equipment_categories')
      .select('organization_id')
      .eq('id', categoryId)
      .single()

    if (!existingCategory) {
      return { success: false, error: 'カテゴリが見つかりません' }
    }

    // システムカテゴリ（organization_id = null）は編集不可
    if (!existingCategory.organization_id) {
      return { success: false, error: 'システムカテゴリは編集できません' }
    }

    // 組織IDチェック
    if (existingCategory.organization_id !== userData.organization_id) {
      return { success: false, error: '他の組織のカテゴリは編集できません' }
    }

    // HTMLエスケープ処理
    const sanitizedData = {
      name: escapeHtml(categoryData.name.trim()),
      code_prefix: categoryData.code_prefix?.trim() ? escapeHtml(categoryData.code_prefix.trim()) : null,
    }

    // カテゴリを更新
    const { data, error } = await supabase
      .from('heavy_equipment_categories')
      .update(sanitizedData)
      .eq('id', categoryId)
      .select()
      .single()

    if (error) throw error

    // キャッシュを再検証
    revalidatePath('/master/equipment-categories')

    return { success: true, data }
  } catch (error: any) {
    console.error('カテゴリ更新エラー:', error)
    return {
      success: false,
      error: error.message || 'カテゴリの更新に失敗しました',
    }
  }
}

/**
 * 重機カテゴリを削除
 */
export async function deleteEquipmentCategory(categoryId: string) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // ユーザーの組織IDと権限取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'ユーザー情報が見つかりません' }
  }

  // 権限チェック（admin または manager のみ）
  if (!['admin', 'manager'].includes(userData.role)) {
    return { success: false, error: '権限がありません' }
  }

  try {
    // カテゴリの所有者チェック
    const { data: existingCategory } = await supabase
      .from('heavy_equipment_categories')
      .select('organization_id')
      .eq('id', categoryId)
      .single()

    if (!existingCategory) {
      return { success: false, error: 'カテゴリが見つかりません' }
    }

    // システムカテゴリ（organization_id = null）は削除不可
    if (!existingCategory.organization_id) {
      return { success: false, error: 'システムカテゴリは削除できません' }
    }

    // 組織IDチェック
    if (existingCategory.organization_id !== userData.organization_id) {
      return { success: false, error: '他の組織のカテゴリは削除できません' }
    }

    // カテゴリを削除
    const { error } = await supabase
      .from('heavy_equipment_categories')
      .delete()
      .eq('id', categoryId)

    if (error) throw error

    // キャッシュを再検証
    revalidatePath('/master/equipment-categories')

    return { success: true }
  } catch (error: any) {
    console.error('カテゴリ削除エラー:', error)
    return {
      success: false,
      error: error.message || 'カテゴリの削除に失敗しました',
    }
  }
}
