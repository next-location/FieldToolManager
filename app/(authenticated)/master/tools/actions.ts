'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

/**
 * 道具マスタを作成
 */
export async function createToolMaster(formData: {
  name: string
  model_number?: string
  manufacturer?: string
  category_id?: string
  unit: string
  minimum_stock: number
  image_url?: string
  notes?: string
}) {
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

  // 権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'name', value: formData.name, label: '道具名' },
    { field: 'model_number', value: formData.model_number, label: '型番' },
    { field: 'manufacturer', value: formData.manufacturer, label: 'メーカー' },
    { field: 'unit', value: formData.unit, label: '単位' },
    { field: 'notes', value: formData.notes, label: '備考' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` }
    }
  }

  // 道具マスタ作成（HTMLエスケープ適用）
  const { data, error } = await supabase
    .from('tools')
    .insert({
      organization_id: userData?.organization_id,
      name: escapeHtml(formData.name),
      model_number: formData.model_number ? escapeHtml(formData.model_number) : null,
      manufacturer: formData.manufacturer ? escapeHtml(formData.manufacturer) : null,
      category_id: formData.category_id || null,
      management_type: 'individual',
      unit: escapeHtml(formData.unit),
      minimum_stock: formData.minimum_stock,
      image_url: formData.image_url || null,
      notes: formData.notes ? escapeHtml(formData.notes) : null,
      is_from_preset: false,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tool master:', error)
    return { error: '道具マスタの作成に失敗しました' }
  }

  revalidatePath('/master/tools')
  return { data }
}

/**
 * 道具マスタを更新
 */
export async function updateToolMaster(
  id: string,
  formData: {
    name: string
    model_number?: string
    manufacturer?: string
    category_id?: string
    unit: string
    minimum_stock: number
    image_url?: string
    notes?: string
  }
) {
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

  // 権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'name', value: formData.name, label: '道具名' },
    { field: 'model_number', value: formData.model_number, label: '型番' },
    { field: 'manufacturer', value: formData.manufacturer, label: 'メーカー' },
    { field: 'unit', value: formData.unit, label: '単位' },
    { field: 'notes', value: formData.notes, label: '備考' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` }
    }
  }

  // 道具マスタ更新（HTMLエスケープ適用）
  const { data, error } = await supabase
    .from('tools')
    .update({
      name: escapeHtml(formData.name),
      model_number: formData.model_number ? escapeHtml(formData.model_number) : null,
      manufacturer: formData.manufacturer ? escapeHtml(formData.manufacturer) : null,
      category_id: formData.category_id || null,
      unit: escapeHtml(formData.unit),
      minimum_stock: formData.minimum_stock,
      image_url: formData.image_url || null,
      notes: formData.notes ? escapeHtml(formData.notes) : null,
    })
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .eq('management_type', 'individual')
    .select()
    .single()

  if (error) {
    console.error('Error updating tool master:', error)
    return { error: '道具マスタの更新に失敗しました' }
  }

  revalidatePath('/master/tools')
  return { data }
}

/**
 * 道具マスタを削除（論理削除）
 */
export async function deleteToolMaster(id: string) {
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

  // 権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  // 個別アイテムが存在するかチェック
  const { count } = await supabase
    .from('tool_items')
    .select('*', { count: 'exact', head: true })
    .eq('tool_id', id)
    .is('deleted_at', null)

  if (count && count > 0) {
    return {
      error: `この道具マスタには${count}個の個別アイテムが登録されています。先に個別アイテムを削除してください。`,
    }
  }

  // 論理削除
  const { error } = await supabase
    .from('tools')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)

  if (error) {
    console.error('Error deleting tool master:', error)
    return { error: '道具マスタの削除に失敗しました' }
  }

  revalidatePath('/master/tools')
  return { success: true }
}

/**
 * プリセットから道具マスタをコピー
 */
export async function copyPresetToOrganization(presetId: string) {
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

  // 権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  // ストアドプロシージャ呼び出し
  const { data, error } = await supabase.rpc('copy_preset_to_organization', {
    p_preset_id: presetId,
    p_organization_id: userData?.organization_id,
  })

  if (error) {
    console.error('Error copying preset:', error)
    return { error: 'プリセットのコピーに失敗しました' }
  }

  revalidatePath('/master/tools')
  return { data }
}
