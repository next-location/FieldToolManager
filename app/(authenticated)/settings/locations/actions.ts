'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { SiteType } from '@/types/site'

export async function createLocation(formData: FormData) {
  try {
    const supabase = await createClient()

    const type = formData.get('type') as SiteType
    const name = formData.get('name') as string
    const address = formData.get('address') as string

    console.log('[CREATE LOCATION] Form data:', { type, name, address })

    // typeが customer_site でないことを確認
    if (type === 'customer_site') {
      throw new Error('顧客現場は現場マスタで管理してください')
    }

    // ユーザー情報と組織IDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      throw new Error('ユーザー情報が見つかりません')
    }

    // admin権限チェック
    if (userData.role !== 'admin') {
      throw new Error('この操作を実行する権限がありません')
    }

    console.log('[CREATE LOCATION] User data:', userData)

    // 拠点を作成
    const insertData = {
      organization_id: userData.organization_id,
      type,
      name,
      address: address || null,
      is_active: true,
    }

    console.log('[CREATE LOCATION] Insert data:', insertData)

    const { data: locationData, error } = await supabase
      .from('sites')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('[CREATE LOCATION] Insert error:', error)
      // 重複エラーの場合はわかりやすいメッセージを表示
      if (error.code === '23505' && error.message.includes('sites_organization_id_name_key')) {
        throw new Error('同じ名前の拠点がすでに登録されています。別の名前を使用してください。')
      }
      throw new Error(`拠点の作成に失敗しました: ${error.message}`)
    }

    console.log('[CREATE LOCATION] Location created:', locationData)

    revalidatePath('/settings/locations')
    redirect('/settings/locations')
  } catch (error) {
    console.error('[CREATE LOCATION] Unexpected error:', error)
    throw error
  }
}

export async function updateLocation(id: string, formData: FormData) {
  try {
    const supabase = await createClient()

    const type = formData.get('type') as SiteType
    const name = formData.get('name') as string
    const address = formData.get('address') as string

    // typeが customer_site でないことを確認
    if (type === 'customer_site') {
      throw new Error('顧客現場は現場マスタで管理してください')
    }

    // ユーザー情報と組織IDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      throw new Error('ユーザー情報が見つかりません')
    }

    // admin権限チェック
    if (userData.role !== 'admin') {
      throw new Error('この操作を実行する権限がありません')
    }

    const { error } = await supabase
      .from('sites')
      .update({
        type,
        name,
        address: address || null,
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      // 重複エラーの場合はわかりやすいメッセージを表示
      if (error.code === '23505' && error.message.includes('sites_organization_id_name_key')) {
        throw new Error('同じ名前の拠点がすでに登録されています。別の名前を使用してください。')
      }
      throw new Error(`拠点の更新に失敗しました: ${error.message}`)
    }

    revalidatePath('/settings/locations')
    redirect('/settings/locations')
  } catch (error) {
    console.error('[UPDATE LOCATION] Unexpected error:', error)
    throw error
  }
}

export async function deleteLocation(id: string) {
  try {
    const supabase = await createClient()

    // ユーザー情報と組織IDを取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      redirect('/login')
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      throw new Error('ユーザー情報が見つかりません')
    }

    // admin権限チェック
    if (userData.role !== 'admin') {
      throw new Error('この操作を実行する権限がありません')
    }

    // 論理削除
    const { error } = await supabase
      .from('sites')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (error) {
      throw new Error(`拠点の削除に失敗しました: ${error.message}`)
    }

    revalidatePath('/settings/locations')
    redirect('/settings/locations')
  } catch (error) {
    console.error('[DELETE LOCATION] Unexpected error:', error)
    throw error
  }
}
