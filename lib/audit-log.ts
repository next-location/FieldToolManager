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

    // IPアドレスとUser Agentを取得（Server Actionsでは取得できないのでnullにする）
    let ip_address = params.ip_address || null
    let user_agent = params.user_agent || null

    try {
      // API Route経由の場合のみheaders()を使用
      const headersList = await headers()
      ip_address = ip_address || headersList.get('x-forwarded-for') || headersList.get('x-real-ip')
      user_agent = user_agent || headersList.get('user-agent')
    } catch (headerError) {
      // Server Actionsではheaders()が使えないのでスキップ
      console.log('[AuditLog] Running in Server Action, headers not available')
    }

    // 監査ログを挿入
    console.log('[AuditLog] Inserting audit log:', {
      organization_id: userData.organization_id,
      user_id: user.id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
    })

    const insertData = {
      organization_id: userData.organization_id,
      user_id: user.id,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id || null,
      old_values: params.old_values || null,
      new_values: params.new_values || null,
      ip_address,
      user_agent,
    }

    console.log('[AuditLog] About to insert:', JSON.stringify(insertData, null, 2))

    const { data, error } = await supabase.from('audit_logs').insert(insertData).select()

    if (error) {
      console.error('[AuditLog] Failed to create audit log:', error)
      console.error('[AuditLog] Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log(`[AuditLog] SUCCESS: ${params.action} ${params.entity_type} ${params.entity_id || ''}`)
      console.log('[AuditLog] Inserted data:', JSON.stringify(data, null, 2))
    }
  } catch (error) {
    console.error('[AuditLog] Unexpected error:', error)
  }
}

/**
 * NextRequestから監査ログを記録する（API Route用）
 */
export async function createAuditLogFromRequest(
  request: Request,
  userId: string,
  organizationId: string,
  params: Omit<CreateAuditLogParams, 'ip_address' | 'user_agent'>
): Promise<void> {
  try {
    const supabase = await createClient()

    // IPアドレスとUser Agentを取得
    const ip_address = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const user_agent = request.headers.get('user-agent')

    // 監査ログを挿入
    const { error } = await supabase.from('audit_logs').insert({
      organization_id: organizationId,
      user_id: userId,
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
  console.log('[logToolCreated] Called with toolId:', toolId)
  await createAuditLog({
    action: 'create',
    entity_type: 'tools',
    entity_id: toolId,
    new_values: toolData,
  })
  console.log('[logToolCreated] Completed')
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

/**
 * 現場の監査ログ
 */
export async function logSiteCreated(siteId: string, siteData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'sites',
    entity_id: siteId,
    new_values: siteData,
  })
}

export async function logSiteUpdated(
  siteId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'sites',
    entity_id: siteId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logSiteDeleted(siteId: string, siteData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'sites',
    entity_id: siteId,
    old_values: siteData,
  })
}

/**
 * 取引先の監査ログ
 */
export async function logClientCreated(clientId: string, clientData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'clients',
    entity_id: clientId,
    new_values: clientData,
  })
}

export async function logClientUpdated(
  clientId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'clients',
    entity_id: clientId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logClientDeleted(clientId: string, clientData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'clients',
    entity_id: clientId,
    old_values: clientData,
  })
}

/**
 * 重機の監査ログ
 */
export async function logEquipmentCreated(equipmentId: string, equipmentData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'equipment',
    entity_id: equipmentId,
    new_values: equipmentData,
  })
}

export async function logEquipmentUpdated(
  equipmentId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'equipment',
    entity_id: equipmentId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logEquipmentDeleted(equipmentId: string, equipmentData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'equipment',
    entity_id: equipmentId,
    old_values: equipmentData,
  })
}

/**
 * 消耗品の監査ログ
 */
export async function logConsumableCreated(consumableId: string, consumableData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'consumables',
    entity_id: consumableId,
    new_values: consumableData,
  })
}

export async function logConsumableUpdated(
  consumableId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'consumables',
    entity_id: consumableId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logConsumableDeleted(consumableId: string, consumableData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'consumables',
    entity_id: consumableId,
    old_values: consumableData,
  })
}

/**
 * 認証・セキュリティの監査ログ
 */
export async function logLogin(userId: string, metadata?: Record<string, any>) {
  await createAuditLog({
    action: 'login',
    entity_type: 'auth',
    entity_id: userId,
    new_values: metadata,
  })
}

export async function logLogout(userId: string, metadata?: Record<string, any>) {
  await createAuditLog({
    action: 'logout',
    entity_type: 'auth',
    entity_id: userId,
    new_values: metadata,
  })
}

export async function logPasswordChanged(userId: string, metadata?: Record<string, any>) {
  await createAuditLog({
    action: 'password_change',
    entity_type: 'auth',
    entity_id: userId,
    new_values: metadata,
  })
}

export async function logPasswordReset(userId: string, metadata?: Record<string, any>) {
  await createAuditLog({
    action: 'password_reset',
    entity_type: 'auth',
    entity_id: userId,
    new_values: metadata,
  })
}

/**
 * 道具移動の監査ログ
 */
export async function logToolMovement(movementId: string, movementData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'tool_movements',
    entity_id: movementId,
    new_values: movementData,
  })
}

/**
 * プロジェクトの監査ログ
 */
export async function logProjectCreated(projectId: string, projectData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'projects',
    entity_id: projectId,
    new_values: projectData,
  })
}

export async function logProjectUpdated(
  projectId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'projects',
    entity_id: projectId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logProjectDeleted(projectId: string, projectData: Record<string, any>) {
  await createAuditLog({
    action: 'delete',
    entity_type: 'projects',
    entity_id: projectId,
    old_values: projectData,
  })
}

/**
 * 発注の監査ログ
 */
export async function logPurchaseOrderCreated(orderId: string, orderData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'purchase_orders',
    entity_id: orderId,
    new_values: orderData,
  })
}

export async function logPurchaseOrderUpdated(
  orderId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'purchase_orders',
    entity_id: orderId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logPurchaseOrderApproved(orderId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'approve',
    entity_type: 'purchase_orders',
    entity_id: orderId,
    new_values: metadata,
  })
}

export async function logPurchaseOrderRejected(orderId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'reject',
    entity_type: 'purchase_orders',
    entity_id: orderId,
    new_values: metadata,
  })
}

/**
 * 見積・請求の監査ログ
 */
export async function logInvoiceCreated(invoiceId: string, invoiceData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'invoices',
    entity_id: invoiceId,
    new_values: invoiceData,
  })
}

export async function logInvoiceUpdated(
  invoiceId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'invoices',
    entity_id: invoiceId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logInvoiceSent(invoiceId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'send',
    entity_type: 'invoices',
    entity_id: invoiceId,
    new_values: metadata,
  })
}

export async function logInvoiceApproved(invoiceId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'approve',
    entity_type: 'invoices',
    entity_id: invoiceId,
    new_values: metadata,
  })
}

/**
 * 見積書の監査ログ
 */
export async function logEstimateCreated(estimateId: string, estimateData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'estimates',
    entity_id: estimateId,
    new_values: estimateData,
  })
}

export async function logEstimateUpdated(
  estimateId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'estimates',
    entity_id: estimateId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logEstimateSent(estimateId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'send',
    entity_type: 'estimates',
    entity_id: estimateId,
    new_values: metadata,
  })
}

export async function logEstimateApproved(estimateId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'approve',
    entity_type: 'estimates',
    entity_id: estimateId,
    new_values: metadata,
  })
}

/**
 * 作業報告の監査ログ
 */
export async function logWorkReportCreated(reportId: string, reportData: Record<string, any>) {
  await createAuditLog({
    action: 'create',
    entity_type: 'work_reports',
    entity_id: reportId,
    new_values: reportData,
  })
}

export async function logWorkReportUpdated(
  reportId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>
) {
  await createAuditLog({
    action: 'update',
    entity_type: 'work_reports',
    entity_id: reportId,
    old_values: oldData,
    new_values: newData,
  })
}

export async function logWorkReportSubmitted(reportId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'submit',
    entity_type: 'work_reports',
    entity_id: reportId,
    new_values: metadata,
  })
}

export async function logWorkReportApproved(reportId: string, metadata: Record<string, any>) {
  await createAuditLog({
    action: 'approve',
    entity_type: 'work_reports',
    entity_id: reportId,
    new_values: metadata,
  })
}

/**
 * 設定変更の監査ログ
 */
export async function logSettingsChanged(settingType: string, oldData: Record<string, any>, newData: Record<string, any>) {
  await createAuditLog({
    action: 'update',
    entity_type: 'settings',
    entity_id: settingType,
    old_values: oldData,
    new_values: newData,
  })
}
