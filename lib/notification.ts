import { createClient } from '@/lib/supabase/server'
import type { CreateNotificationParams } from '@/types/notification'

/**
 * 通知を作成する
 */
export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    const supabase = await createClient()

    // 現在のユーザー情報を取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[Notification] No authenticated user, skipping notification')
      return
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.warn('[Notification] User data not found, skipping notification')
      return
    }

    // 通知を挿入
    const { error } = await supabase.from('notifications').insert({
      organization_id: userData.organization_id,
      type: params.type,
      title: params.title,
      message: params.message,
      severity: params.severity || 'info',
      related_tool_id: params.related_tool_id || null,
      related_user_id: params.related_user_id || null,
      metadata: params.metadata || {},
      sent_via: params.sent_via || ['in_app'],
    })

    if (error) {
      console.error('[Notification] Failed to create notification:', error)
    } else {
      console.log(`[Notification] Created: ${params.type} - ${params.title}`)
    }
  } catch (error) {
    console.error('[Notification] Unexpected error:', error)
  }
}

/**
 * 低在庫アラート通知
 */
export async function notifyLowStock(toolId: string, toolName: string, currentStock: number, minStock: number) {
  await createNotification({
    type: 'low_stock',
    title: '低在庫アラート',
    message: `「${toolName}」の在庫が最小値（${minStock}）を下回っています。現在: ${currentStock}`,
    severity: 'warning',
    related_tool_id: toolId,
    metadata: {
      tool_name: toolName,
      current_stock: currentStock,
      min_stock: minStock,
    },
  })
}

/**
 * 道具作成通知
 */
export async function notifyToolCreated(toolId: string, toolName: string) {
  await createNotification({
    type: 'tool_created',
    title: '道具が登録されました',
    message: `「${toolName}」が登録されました`,
    severity: 'success',
    related_tool_id: toolId,
  })
}

/**
 * 道具更新通知
 */
export async function notifyToolUpdated(toolId: string, toolName: string) {
  await createNotification({
    type: 'tool_updated',
    title: '道具情報が更新されました',
    message: `「${toolName}」の情報が更新されました`,
    severity: 'info',
    related_tool_id: toolId,
  })
}

/**
 * 道具削除通知
 */
export async function notifyToolDeleted(toolId: string, toolName: string) {
  await createNotification({
    type: 'tool_deleted',
    title: '道具が削除されました',
    message: `「${toolName}」が削除されました`,
    severity: 'info',
    related_tool_id: toolId,
  })
}

/**
 * 月次棚卸しリマインダー通知
 */
export async function notifyMonthlyInventory() {
  await createNotification({
    type: 'monthly_inventory',
    title: '月次棚卸しのお知らせ',
    message: '今月の棚卸しを実施してください',
    severity: 'info',
  })
}

/**
 * 通知を既読にする
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user.id,
      })
      .eq('id', notificationId)

    if (error) {
      console.error('[Notification] Failed to mark as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notification] Unexpected error:', error)
    return false
  }
}

/**
 * 全通知を既読にする
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return false
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return false
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: user.id,
      })
      .eq('organization_id', userData.organization_id)
      .eq('is_read', false)

    if (error) {
      console.error('[Notification] Failed to mark all as read:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[Notification] Unexpected error:', error)
    return false
  }
}

/**
 * 発注書承認通知
 */
export async function notifyPurchaseOrderApproved(
  purchaseOrderId: string,
  orderNumber: string,
  createdBy: string,
  approvedBy: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // 現在のユーザー情報を取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[Notification] No authenticated user, skipping notification')
      return
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.warn('[Notification] User data not found, skipping notification')
      return
    }

    // 通知を作成（作成者宛て）
    const { error } = await supabase.from('notifications').insert({
      organization_id: userData.organization_id,
      type: 'purchase_order_approved',
      title: '発注書が承認されました',
      message: `発注書「${orderNumber}」が承認されました`,
      severity: 'success',
      target_user_id: createdBy,
      related_purchase_order_id: purchaseOrderId,
      metadata: {
        order_number: orderNumber,
        approved_by: approvedBy,
      },
      sent_via: ['in_app'],
    })

    if (error) {
      console.error('[Notification] Failed to create purchase order approved notification:', error)
    } else {
      console.log(`[Notification] Created: purchase_order_approved - ${orderNumber}`)
    }
  } catch (error) {
    console.error('[Notification] Unexpected error:', error)
  }
}

/**
 * 発注書差し戻し通知
 */
export async function notifyPurchaseOrderRejected(
  purchaseOrderId: string,
  orderNumber: string,
  createdBy: string,
  rejectedBy: string,
  reason?: string
): Promise<void> {
  try {
    const supabase = await createClient()

    // 現在のユーザー情報を取得
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.warn('[Notification] No authenticated user, skipping notification')
      return
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.warn('[Notification] User data not found, skipping notification')
      return
    }

    // 通知を作成（作成者宛て）
    const { error } = await supabase.from('notifications').insert({
      organization_id: userData.organization_id,
      type: 'purchase_order_rejected',
      title: '発注書が差し戻されました',
      message: reason
        ? `発注書「${orderNumber}」が差し戻されました。理由: ${reason}`
        : `発注書「${orderNumber}」が差し戻されました`,
      severity: 'warning',
      target_user_id: createdBy,
      related_purchase_order_id: purchaseOrderId,
      metadata: {
        order_number: orderNumber,
        rejected_by: rejectedBy,
        reason: reason || '',
      },
      sent_via: ['in_app'],
    })

    if (error) {
      console.error('[Notification] Failed to create purchase order rejected notification:', error)
    } else {
      console.log(`[Notification] Created: purchase_order_rejected - ${orderNumber}`)
    }
  } catch (error) {
    console.error('[Notification] Unexpected error:', error)
  }
}
