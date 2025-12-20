'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// プリセットから道具マスタを作成
export async function copyPresetToOrganization(presetId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  // プリセット情報を取得
  const { data: preset, error: presetError } = await supabase
    .from('tool_master_presets')
    .select('*')
    .eq('id', presetId)
    .single()

  if (presetError || !preset) {
    return { error: 'プリセットが見つかりません' }
  }

  // 組織固有の道具マスタとして登録
  const { error: insertError } = await supabase
    .from('tools')
    .insert({
      organization_id: userData.organization_id,
      name: preset.name,
      model_number: preset.model_number,
      manufacturer: preset.manufacturer,
      management_type: 'individual',
      unit: preset.unit,
      minimum_stock: 1,
      image_url: preset.image_url,
      notes: preset.notes,
      is_from_preset: true,
      preset_id: preset.id,
    })

  if (insertError) {
    return { error: `登録に失敗しました: ${insertError.message}` }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}

// 道具マスタ削除
export async function deleteToolMaster(masterId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    return { error: '削除権限がありません（Admin のみ）' }
  }

  const { error } = await supabase
    .from('tools')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', masterId)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}

// 消耗品マスタ削除
export async function deleteConsumableMaster(masterId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    return { error: '削除権限がありません（Admin のみ）' }
  }

  const { error } = await supabase
    .from('tools')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', masterId)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}

// 道具マスタ作成・更新
export async function createOrUpdateToolMaster(data: {
  id?: string
  name: string
  model_number?: string
  manufacturer?: string
  category_id?: string
  unit: string
  minimum_stock: number
  image_url?: string
  notes?: string
  organization_id: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  if (data.id) {
    // 更新
    const { error } = await supabase
      .from('tools')
      .update({
        name: data.name,
        model_number: data.model_number || null,
        manufacturer: data.manufacturer || null,
        category_id: data.category_id || null,
        unit: data.unit,
        minimum_stock: data.minimum_stock,
        image_url: data.image_url || null,
        notes: data.notes || null,
      })
      .eq('id', data.id)

    if (error) {
      return { error: `更新に失敗しました: ${error.message}` }
    }
  } else {
    // 新規作成
    const { error } = await supabase.from('tools').insert({
      organization_id: data.organization_id,
      name: data.name,
      model_number: data.model_number || null,
      manufacturer: data.manufacturer || null,
      category_id: data.category_id || null,
      management_type: 'individual',
      unit: data.unit,
      minimum_stock: data.minimum_stock,
      image_url: data.image_url || null,
      notes: data.notes || null,
      is_from_preset: false,
    })

    if (error) {
      return { error: `登録に失敗しました: ${error.message}` }
    }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}

// 消耗品マスタ作成・更新
export async function createOrUpdateConsumableMaster(data: {
  id?: string
  name: string
  model_number?: string
  manufacturer?: string
  category_id?: string
  unit: string
  minimum_stock: number
  image_url?: string
  notes?: string
  organization_id: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  if (data.id) {
    // 更新
    const { error } = await supabase
      .from('tools')
      .update({
        name: data.name,
        model_number: data.model_number || null,
        manufacturer: data.manufacturer || null,
        category_id: data.category_id || null,
        unit: data.unit,
        minimum_stock: data.minimum_stock,
        image_url: data.image_url || null,
        notes: data.notes || null,
      })
      .eq('id', data.id)

    if (error) {
      return { error: `更新に失敗しました: ${error.message}` }
    }
  } else {
    // 新規作成
    const { error } = await supabase.from('tools').insert({
      organization_id: data.organization_id,
      name: data.name,
      model_number: data.model_number || null,
      manufacturer: data.manufacturer || null,
      category_id: data.category_id || null,
      management_type: 'consumable',
      unit: data.unit,
      minimum_stock: data.minimum_stock,
      image_url: data.image_url || null,
      notes: data.notes || null,
    })

    if (error) {
      return { error: `登録に失敗しました: ${error.message}` }
    }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}

// カテゴリ作成・更新
export async function createOrUpdateCategory(data: {
  id?: string
  name: string
  description?: string
  organization_id: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['manager', 'admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません（Manager/Admin のみ）' }
  }

  if (data.id) {
    // 更新
    const { error } = await supabase
      .from('tool_categories')
      .update({
        name: data.name,
        description: data.description || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id)

    if (error) {
      return { error: `更新に失敗しました: ${error.message}` }
    }
  } else {
    // 新規作成
    const { error } = await supabase.from('tool_categories').insert({
      organization_id: data.organization_id,
      name: data.name,
      description: data.description || null,
    })

    if (error) {
      return { error: `登録に失敗しました: ${error.message}` }
    }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}

// カテゴリ削除
export async function deleteCategoryMaster(categoryId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証エラー' }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    return { error: '削除権限がありません（Admin のみ）' }
  }

  const { error } = await supabase
    .from('tool_categories')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', categoryId)

  if (error) {
    return { error: `削除に失敗しました: ${error.message}` }
  }

  revalidatePath('/master/tools-consumables')
  return { success: true }
}
