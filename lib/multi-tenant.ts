import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * 現在のユーザーの組織IDを取得
 */
export async function getCurrentOrganizationId(): Promise<string | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  return userData?.organization_id || null
}

/**
 * 現在のユーザーの組織情報を取得
 */
export async function getCurrentOrganization() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select(
      `
      organization_id,
      organizations (
        id,
        name,
        subdomain,
        plan,
        is_active
      )
    `
    )
    .eq('id', user.id)
    .single()

  return userData?.organizations || null
}

/**
 * サブドメインから組織IDを取得
 */
export async function getOrganizationBySubdomain(
  subdomain: string
): Promise<{ id: string; name: string; is_active: boolean } | null> {
  const supabase = await createClient()

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, is_active')
    .eq('subdomain', subdomain)
    .single()

  return organization
}

/**
 * 現在のリクエストからサブドメインを抽出
 */
export function extractSubdomain(hostname: string): string | null {
  // localhost や IPアドレスの場合はnullを返す
  if (hostname === 'localhost' || /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    return null
  }

  // サブドメインの抽出
  // 例: a-kensetsu.tool-manager.com → a-kensetsu
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

/**
 * 組織へのアクセス権限をチェック
 */
export async function checkOrganizationAccess(
  resourceOrganizationId: string
): Promise<boolean> {
  const currentOrgId = await getCurrentOrganizationId()

  if (!currentOrgId) {
    return false
  }

  return currentOrgId === resourceOrganizationId
}

/**
 * ユーザーの役割を取得
 */
export async function getUserRole(): Promise<'admin' | 'leader' | 'staff' | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  return userData?.role as 'admin' | 'leader' | 'staff' | null
}

/**
 * 役割による権限チェック
 */
export async function checkRole(
  allowedRoles: ('admin' | 'leader' | 'staff')[]
): Promise<boolean> {
  const role = await getUserRole()

  if (!role) {
    return false
  }

  return allowedRoles.includes(role)
}

/**
 * ユーザー情報を取得（組織情報含む）
 */
export async function getCurrentUserWithOrganization() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      name,
      role,
      organization_id,
      organizations (
        id,
        name,
        subdomain,
        plan,
        is_active
      )
    `
    )
    .eq('id', user.id)
    .single()

  return userData
}
