import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AuditAction, CreateAuditLogParams } from '@/types/audit-log'

/**
 * 監査ログを記録する
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    const supabase = await createClient()

    // 現在のユーザー情報を取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[AuditLog] No authenticated user, skipping audit log')
      return
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.warn('[AuditLog] User data not found, skipping audit log')
      return
    }

    // IPアドレスとUser Agentを取得
    const headersList = await headers()
    const ip_address = params.ip_address || headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
    const user_agent = params.user_agent || headersList.get('user-agent')

    // 監査ログを挿入
    const { error } = await supabase.from('audit_logs').insert({
      organization_id: userData.organization_id,
      user_id: user.id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      old_values: params.old_values || null,
      new_values: params.new_values || null,
      ip_address,
      user_agent,
    })

    if (error) {
      console.error('[AuditLog] Failed to create audit log:', error)
    } else {
      console.log(`[AuditLog] ${params.action} ${params.entity_type} ${params.entity_id || ''}`)
    }
  } catch (error) {
    console.error('[AuditLog] Unexpected error:', error)
  }
}

/**
 * 道具作成の監査ログ
 */
export async function logToolCreated(toolId: string, toolData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'tools',
    entity_id: toolId,
    new_values: toolData,
  })
}

/**
 * 道具更新の監査ログ
 */
export async function logToolUpdated(
  toolId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'tools',
    entity_id: toolId,
    old_values: oldData,
    new_values: newData,
  })
}

/**
 * 道具削除の監査ログ
 */
export async function logToolDeleted(toolId: string, toolData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'tools',
    entity_id: toolId,
    old_values: toolData,
  })
}

/**
 * ユーザー作成の監査ログ
 */
export async function logUserCreated(userId: string, userData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'users',
    entity_id: userId,
    new_values: userData,
  })
}

/**
 * ユーザー更新の監査ログ
 */
export async function logUserUpdated(
  userId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'users',
    entity_id: userId,
    old_values: oldData,
    new_values: newData,
  })
}

/**
 * ユーザー削除の監査ログ
 */
export async function logUserDeleted(userId: string, userData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'users',
    entity_id: userId,
    old_values: userData,
  })
}
