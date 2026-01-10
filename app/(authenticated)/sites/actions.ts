'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createSite(formData: FormData) {
  try {
    const supabase = await createClient()

    const name = formData.get('name') as string
    const address = formData.get('address') as string
    const manager_id = formData.get('manager_id') as string | null
    const client_id = formData.get('client_id') as string | null

    console.log('[CREATE SITE] Form data:', { name, address, manager_id, client_id })

    // ユーザー情報と組織IDを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報が見つかりません')
  }

    console.log('[CREATE SITE] User data:', userData)

    // 現場を作成
    const insertData = {
      organization_id: userData?.organization_id,
      name,
      address: address || null,
      manager_id: manager_id || null,
      client_id: client_id || null,
      is_active: true,
    }

    console.log('[CREATE SITE] Insert data:', insertData)

    const { data: siteData, error } = await supabase.from('sites').insert(insertData).select().single()

    if (error) {
      console.error('[CREATE SITE] Insert error:', error)
      // 重複エラーの場合はわかりやすいメッセージを表示
      if (error.code === '23505' && error.message.includes('sites_organization_id_name_key')) {
        throw new Error('同じ名前の現場がすでに登録されています。別の名前を使用してください。')
      }
      throw new Error(`現場の作成に失敗しました: ${error.message}`)
    }

    console.log('[CREATE SITE] Site created:', siteData)

    revalidatePath('/sites')
    redirect('/sites')
  } catch (error) {
    console.error('[CREATE SITE] Unexpected error:', error)
    throw error
  }
}

export async function updateSite(id: string, formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const manager_id = formData.get('manager_id') as string | null
  const client_id = formData.get('client_id') as string | null
  const is_active = formData.get('is_active') === 'true'

  const { error } = await supabase
    .from('sites')
    .update({
      name,
      address: address || null,
      manager_id: manager_id || null,
      client_id: client_id || null,
      is_active,
    })
    .eq('id', id)

  if (error) {
    // 重複エラーの場合はわかりやすいメッセージを表示
    if (error.code === '23505' && error.message.includes('sites_organization_id_name_key')) {
      throw new Error('同じ名前の現場がすでに登録されています。別の名前を使用してください。')
    }
    throw new Error(`現場の更新に失敗しました: ${error.message}`)
  }

  revalidatePath('/sites')
  revalidatePath(`/sites/${id}`)
  redirect('/sites')
}

export async function completeSite(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('sites')
    .update({
      is_active: false,
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`現場の完了処理に失敗しました: ${error.message}`)
  }

  revalidatePath('/sites')
  revalidatePath(`/sites/${id}`)
}

export async function deleteSite(id: string) {
  const supabase = await createClient()

  // ストアドプロシージャを使用してRLSをバイパス
  const { error } = await supabase.rpc('delete_site', { site_id: id })

  if (error) {
    throw new Error(`現場の削除に失敗しました: ${error.message}`)
  }

  revalidatePath('/sites')
  // クライアント側でリダイレクトするため、ここではredirectしない
}
