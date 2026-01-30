'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logSiteCreated, logSiteUpdated, logSiteDeleted } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

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

    // 不審なパターン検出
    if (name && hasSuspiciousPattern(name)) {
      throw new Error('現場名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
    }
    if (address && hasSuspiciousPattern(address)) {
      throw new Error('住所に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
    }

    // 現場を作成（HTMLエスケープ適用）
    const insertData = {
      organization_id: userData?.organization_id,
      name: escapeHtml(name),
      address: address ? escapeHtml(address) : null,
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

    // 監査ログを記録
    await logSiteCreated(siteData.id, {
      name: siteData.name,
      address: siteData.address,
      manager_id: siteData.manager_id,
      client_id: siteData.client_id,
    }, user.id, userData.organization_id)

    revalidatePath('/sites')
    redirect('/sites')
  } catch (error) {
    console.error('[CREATE SITE] Unexpected error:', error)
    throw error
  }
}

export async function updateSite(id: string, formData: FormData) {
  const supabase = await createClient()

  // ユーザー情報と組織IDを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報が見つかりません')
  }

  // 更新前のデータを取得
  const { data: oldData } = await supabase
    .from('sites')
    .select('*')
    .eq('id', id)
    .single()

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const manager_id = formData.get('manager_id') as string | null
  const client_id = formData.get('client_id') as string | null
  const is_active = formData.get('is_active') === 'true'

  // 不審なパターン検出
  if (name && hasSuspiciousPattern(name)) {
    throw new Error('現場名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
  }
  if (address && hasSuspiciousPattern(address)) {
    throw new Error('住所に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
  }

  const newData = {
    name: escapeHtml(name),
    address: address ? escapeHtml(address) : null,
    manager_id: manager_id || null,
    client_id: client_id || null,
    is_active,
  }

  const { error } = await supabase
    .from('sites')
    .update(newData)
    .eq('id', id)

  if (error) {
    // 重複エラーの場合はわかりやすいメッセージを表示
    if (error.code === '23505' && error.message.includes('sites_organization_id_name_key')) {
      throw new Error('同じ名前の現場がすでに登録されています。別の名前を使用してください。')
    }
    throw new Error(`現場の更新に失敗しました: ${error.message}`)
  }

  // 監査ログを記録
  if (oldData) {
    await logSiteUpdated(id, oldData, newData, user.id, userData.organization_id)
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
