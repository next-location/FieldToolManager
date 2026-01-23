import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import type { AuditAction, CreateAuditLogParams } from '@/types/audit-log'

/**
 * 監査ログを記録する（既存のSupabaseクライアントと認証情報を受け取る）
 */
export async function createAuditLog(
  params: CreateAuditLogParams,
  userId?: string,
  organizationId?: string
): Promise<void> {
  try {
    console.log('[AuditLog] createAuditLog called:', {
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
      userId,
      organizationId,
    })

    // Service Role Keyを使用してRLSをバイパス
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js')
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // ユーザーIDと組織IDが渡されていない場合は取得を試みる
    let finalUserId = userId
    let finalOrganizationId = organizationId

    if (!finalUserId || !finalOrganizationId) {
      console.log('[AuditLog] userId or organizationId not provided, fetching from auth')
      // 現在のユーザー情報を取得
      const {
        data: { user },
      } = await supabase.auth.getUser()

      console.log('[AuditLog] getUser result:', user ? `User ID: ${user.id}` : 'No user')

      if (!user) {
        console.warn('[AuditLog] No authenticated user and no userId provided, skipping audit log')
        return
      }

      finalUserId = user.id

      // ユーザーの組織IDを取得
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      console.log('[AuditLog] userData result:', userData)

      if (!userData) {
        console.warn('[AuditLog] User data not found, skipping audit log')
        return
      }

      finalOrganizationId = userData.organization_id
    }

    console.log('[AuditLog] Final values:', {
      finalUserId,
      finalOrganizationId,
    })

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
      organization_id: finalOrganizationId,
      user_id: finalUserId,
      action: params.action,
      entity_type: params.entity_type,
      entity_id: params.entity_id,
    })

    const insertData = {
      organization_id: finalOrganizationId,
      user_id: finalUserId,
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
export async function logToolCreated(
  toolId: string,
  toolData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  console.log('[logToolCreated] Called with toolId:', toolId)
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'tools',
      entity_id: toolId,
      new_values: toolData,
    },
    userId,
    organizationId
  )
  console.log('[logToolCreated] Completed')
}

/**
 * 道具更新の監査ログ
 */
export async function logToolUpdated(
  toolId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'tools',
      entity_id: toolId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

/**
 * 道具削除の監査ログ
 */
export async function logToolDeleted(
  toolId: string,
  toolData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'tools',
      entity_id: toolId,
      old_values: toolData,
    },
    userId,
    organizationId
  )
}

/**
 * ユーザー作成の監査ログ
 */
export async function logUserCreated(
  userId: string,
  userData: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'users',
      entity_id: userId,
      new_values: userData,
    },
    actorUserId,
    organizationId
  )
}

/**
 * ユーザー更新の監査ログ
 */
export async function logUserUpdated(
  userId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'users',
      entity_id: userId,
      old_values: oldData,
      new_values: newData,
    },
    actorUserId,
    organizationId
  )
}

/**
 * ユーザー削除の監査ログ
 */
export async function logUserDeleted(
  userId: string,
  userData: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'users',
      entity_id: userId,
      old_values: userData,
    },
    actorUserId,
    organizationId
  )
}

/**
 * 現場の監査ログ
 */
export async function logSiteCreated(
  siteId: string,
  siteData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'sites',
      entity_id: siteId,
      new_values: siteData,
    },
    userId,
    organizationId
  )
}

export async function logSiteUpdated(
  siteId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'sites',
      entity_id: siteId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logSiteDeleted(
  siteId: string,
  siteData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'sites',
      entity_id: siteId,
      old_values: siteData,
    },
    userId,
    organizationId
  )
}

/**
 * 取引先の監査ログ
 */
export async function logClientCreated(
  clientId: string,
  clientData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'clients',
      entity_id: clientId,
      new_values: clientData,
    },
    userId,
    organizationId
  )
}

export async function logClientUpdated(
  clientId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'clients',
      entity_id: clientId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logClientDeleted(
  clientId: string,
  clientData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'clients',
      entity_id: clientId,
      old_values: clientData,
    },
    userId,
    organizationId
  )
}

/**
 * 重機の監査ログ
 */
export async function logEquipmentCreated(
  equipmentId: string,
  equipmentData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'equipment',
      entity_id: equipmentId,
      new_values: equipmentData,
    },
    userId,
    organizationId
  )
}

export async function logEquipmentUpdated(
  equipmentId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'equipment',
      entity_id: equipmentId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logEquipmentDeleted(
  equipmentId: string,
  equipmentData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'equipment',
      entity_id: equipmentId,
      old_values: equipmentData,
    },
    userId,
    organizationId
  )
}

export async function logEquipmentMovement(
  equipmentId: string,
  actionType: 'checkout' | 'checkin' | 'transfer',
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: actionType, // checkout, checkin, transfer
      entity_type: 'equipment',
      entity_id: equipmentId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

/**
 * 消耗品の監査ログ
 */
export async function logConsumableCreated(
  consumableId: string,
  consumableData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'consumables',
      entity_id: consumableId,
      new_values: consumableData,
    },
    userId,
    organizationId
  )
}

export async function logConsumableUpdated(
  consumableId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'consumables',
      entity_id: consumableId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logConsumableDeleted(
  consumableId: string,
  consumableData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'consumables',
      entity_id: consumableId,
      old_values: consumableData,
    },
    userId,
    organizationId
  )
}

export async function logConsumableAdjusted(
  consumableId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'adjust',
      entity_type: 'consumables',
      entity_id: consumableId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

/**
 * 認証・セキュリティの監査ログ
 */
export async function logLogin(
  userId: string,
  metadata?: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'login',
      entity_type: 'auth',
      entity_id: userId,
      new_values: metadata,
    },
    actorUserId,
    organizationId
  )
}

export async function logLogout(
  userId: string,
  metadata?: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'logout',
      entity_type: 'auth',
      entity_id: userId,
      new_values: metadata,
    },
    actorUserId,
    organizationId
  )
}

export async function logPasswordChanged(
  userId: string,
  metadata?: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'password_change',
      entity_type: 'auth',
      entity_id: userId,
      new_values: metadata,
    },
    actorUserId,
    organizationId
  )
}

export async function logPasswordReset(
  userId: string,
  metadata?: Record<string, any>,
  actorUserId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'password_reset',
      entity_type: 'auth',
      entity_id: userId,
      new_values: metadata,
    },
    actorUserId,
    organizationId
  )
}

/**
 * 道具移動の監査ログ
 */
export async function logToolMovement(
  movementId: string,
  movementData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  // movement_typeから適切なアクションを判定
  let action: 'move' | 'checkout' | 'checkin' | 'transfer' = 'move'
  if (movementData.movement_type === 'check_out') {
    action = 'checkout'
  } else if (movementData.movement_type === 'check_in') {
    action = 'checkin'
  } else if (movementData.movement_type === 'transfer') {
    action = 'transfer'
  }

  await createAuditLog(
    {
      action,
      entity_type: 'tool_movements',
      entity_id: movementId,
      new_values: movementData,
    },
    userId,
    organizationId
  )
}

/**
 * プロジェクトの監査ログ
 */
export async function logProjectCreated(
  projectId: string,
  projectData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'projects',
      entity_id: projectId,
      new_values: projectData,
    },
    userId,
    organizationId
  )
}

export async function logProjectUpdated(
  projectId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'projects',
      entity_id: projectId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logProjectDeleted(
  projectId: string,
  projectData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'projects',
      entity_id: projectId,
      old_values: projectData,
    },
    userId,
    organizationId
  )
}

/**
 * 発注の監査ログ
 */
export async function logPurchaseOrderCreated(
  orderId: string,
  orderData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'purchase_orders',
      entity_id: orderId,
      new_values: orderData,
    },
    userId,
    organizationId
  )
}

export async function logPurchaseOrderUpdated(
  orderId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'purchase_orders',
      entity_id: orderId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logPurchaseOrderApproved(
  orderId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'approve',
      entity_type: 'purchase_orders',
      entity_id: orderId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

export async function logPurchaseOrderRejected(
  orderId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'reject',
      entity_type: 'purchase_orders',
      entity_id: orderId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

/**
 * 見積・請求の監査ログ
 */
export async function logInvoiceCreated(
  invoiceId: string,
  invoiceData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'invoices',
      entity_id: invoiceId,
      new_values: invoiceData,
    },
    userId,
    organizationId
  )
}

export async function logInvoiceUpdated(
  invoiceId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'invoices',
      entity_id: invoiceId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logInvoiceSent(
  invoiceId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'send',
      entity_type: 'invoices',
      entity_id: invoiceId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

export async function logInvoicePayment(
  invoiceId: string,
  paymentData: {
    amount: number
    payment_method: string
    payment_date: string
    reference_number?: string
    is_full_payment: boolean
    paid_amount_before: number
    paid_amount_after: number
  },
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'payment',
      entity_type: 'invoices',
      entity_id: invoiceId,
      old_values: {
        paid_amount: paymentData.paid_amount_before,
        status: paymentData.is_full_payment ? 'sent' : 'sent'
      },
      new_values: {
        paid_amount: paymentData.paid_amount_after,
        status: paymentData.is_full_payment ? 'paid' : 'sent',
        payment_amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        payment_date: paymentData.payment_date,
        reference_number: paymentData.reference_number,
        is_full_payment: paymentData.is_full_payment
      },
    },
    userId,
    organizationId
  )
}

export async function logInvoiceApproved(
  invoiceId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'approve',
      entity_type: 'invoices',
      entity_id: invoiceId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

/**
 * 見積書の監査ログ
 */
export async function logEstimateCreated(
  estimateId: string,
  estimateData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'estimates',
      entity_id: estimateId,
      new_values: estimateData,
    },
    userId,
    organizationId
  )
}

export async function logEstimateUpdated(
  estimateId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'estimates',
      entity_id: estimateId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logEstimateSent(
  estimateId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'send',
      entity_type: 'estimates',
      entity_id: estimateId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

export async function logEstimateApproved(
  estimateId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'approve',
      entity_type: 'estimates',
      entity_id: estimateId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

/**
 * 作業報告の監査ログ
 */
export async function logWorkReportCreated(
  reportId: string,
  reportData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'create',
      entity_type: 'work_reports',
      entity_id: reportId,
      new_values: reportData,
    },
    userId,
    organizationId
  )
}

export async function logWorkReportUpdated(
  reportId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'work_reports',
      entity_id: reportId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logWorkReportSubmitted(
  reportId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'submit',
      entity_type: 'work_reports',
      entity_id: reportId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

export async function logWorkReportApproved(
  reportId: string,
  metadata: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'approve',
      entity_type: 'work_reports',
      entity_id: reportId,
      new_values: metadata,
    },
    userId,
    organizationId
  )
}

/**
 * 設定変更の監査ログ
 */
export async function logSettingsChanged(
  settingType: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'settings',
      entity_id: settingType,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

/**
 * 勤怠記録の監査ログ
 */
export async function logAttendanceRecordUpdated(
  recordId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'update',
      entity_type: 'attendance_records',
      entity_id: recordId,
      old_values: oldData,
      new_values: newData,
    },
    userId,
    organizationId
  )
}

export async function logAttendanceRecordDeleted(
  recordId: string,
  recordData: Record<string, any>,
  userId?: string,
  organizationId?: string
) {
  await createAuditLog(
    {
      action: 'delete',
      entity_type: 'attendance_records',
      entity_id: recordId,
      old_values: recordData,
    },
    userId,
    organizationId
  )
}
