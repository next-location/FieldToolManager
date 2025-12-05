import { createClient } from '@/lib/supabase/server'
import type { Client, CreateClientInput, UpdateClientInput } from '@/types/clients'

/**
 * 取引先一覧を取得
 */
export async function getClients(filters?: {
  client_type?: string
  is_active?: boolean
  search?: string
  page?: number
  limit?: number
}) {
  const supabase = await createClient()

  // ユーザー認証
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }

  // クエリ構築
  let query = supabase
    .from('clients')
    .select('*', { count: 'exact' })
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)

  // フィルター適用
  if (filters?.client_type) {
    query = query.eq('client_type', filters.client_type)
  }

  if (filters?.is_active !== undefined) {
    query = query.eq('is_active', filters.is_active)
  }

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,name_kana.ilike.%${filters.search}%`
    )
  }

  // ページネーション
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const offset = (page - 1) * limit

  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`取引先一覧の取得に失敗しました: ${error.message}`)
  }

  return {
    data: data as Client[],
    count: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  }
}

/**
 * 取引先詳細を取得
 */
export async function getClientById(id: string) {
  const supabase = await createClient()

  // ユーザー認証
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }

  // 取引先取得
  const { data: client, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .single()

  if (error) {
    throw new Error(`取引先詳細の取得に失敗しました: ${error.message}`)
  }

  return client as Client
}

/**
 * 取引先を作成
 */
export async function createClient(input: CreateClientInput) {
  const supabase = await createClient()

  // ユーザー認証
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }

  // 取引先コード生成
  const code = await generateClientCode(userData.organization_id)

  // 取引先作成
  const { data, error } = await supabase
    .from('clients')
    .insert({
      organization_id: userData.organization_id,
      code,
      ...input,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`取引先の作成に失敗しました: ${error.message}`)
  }

  return data as Client
}

/**
 * 取引先を更新
 */
export async function updateClient(id: string, input: UpdateClientInput) {
  const supabase = await createClient()

  // ユーザー認証
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }

  // 取引先更新
  const { data, error } = await supabase
    .from('clients')
    .update(input)
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .select()
    .single()

  if (error) {
    throw new Error(`取引先の更新に失敗しました: ${error.message}`)
  }

  return data as Client
}

/**
 * 取引先を削除（論理削除）
 */
export async function deleteClient(id: string) {
  const supabase = await createClient()

  // ユーザー認証
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }

  // 関連現場チェック
  const { data: relatedSites, error: sitesError } = await supabase
    .from('sites')
    .select('id')
    .eq('client_id', id)
    .is('deleted_at', null)

  if (sitesError) {
    throw new Error(`関連現場の確認に失敗しました: ${sitesError.message}`)
  }

  if (relatedSites && relatedSites.length > 0) {
    throw new Error(
      `この取引先には${relatedSites.length}件の現場が紐づいているため削除できません`
    )
  }

  // 論理削除
  const { error } = await supabase
    .from('clients')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .eq('organization_id', userData.organization_id)

  if (error) {
    throw new Error(`取引先の削除に失敗しました: ${error.message}`)
  }
}

/**
 * 取引先統計情報を取得
 */
export async function getClientStats() {
  const supabase = await createClient()

  // ユーザー認証
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報の取得に失敗しました')
  }

  // 統計情報を取得
  const { data: clients, error } = await supabase
    .from('clients')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)

  if (error) {
    throw new Error(`統計情報の取得に失敗しました: ${error.message}`)
  }

  // 統計計算
  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.is_active).length,
    inactive: clients.filter((c) => !c.is_active).length,
    byType: {
      customer: clients.filter((c) => c.client_type === 'customer').length,
      supplier: clients.filter((c) => c.client_type === 'supplier').length,
      partner: clients.filter((c) => c.client_type === 'partner').length,
      both: clients.filter((c) => c.client_type === 'both').length,
    },
    averageRating:
      clients.length > 0
        ? clients.filter((c) => c.rating !== null).reduce((sum, c) => sum + (c.rating || 0), 0) /
          clients.filter((c) => c.rating !== null).length
        : 0,
  }

  return stats
}

/**
 * 取引先コードを生成
 */
export async function generateClientCode(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('generate_client_code', {
    org_id: organizationId,
  })

  if (error) {
    throw new Error(`取引先コードの生成に失敗しました: ${error.message}`)
  }

  return data as string
}
