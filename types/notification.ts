// 通知の型定義

export type NotificationType =
  | 'low_stock'           // 低在庫アラート
  | 'unreturned_tool'     // 道具未返却
  | 'monthly_inventory'   // 月次棚卸しリマインダー
  | 'maintenance_due'     // 保守期限
  | 'tool_created'        // 道具登録
  | 'tool_updated'        // 道具更新
  | 'tool_deleted'        // 道具削除
  | 'user_invited'        // ユーザー招待
  | 'contract_expiring'   // 契約期限
  | 'system_announcement' // システムお知らせ

export type NotificationSeverity = 'info' | 'warning' | 'error' | 'success'

export type NotificationChannel = 'in_app' | 'email' | 'slack'

export interface Notification {
  id: string
  organization_id: string
  type: NotificationType
  title: string
  message: string
  severity: NotificationSeverity
  related_tool_id: string | null
  related_user_id: string | null
  metadata: Record<string, any>
  is_read: boolean
  read_at: string | null
  read_by: string | null
  sent_via: NotificationChannel[]
  sent_at: string
  created_at: string
  deleted_at: string | null
}

export interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  severity?: NotificationSeverity
  related_tool_id?: string
  related_user_id?: string
  metadata?: Record<string, any>
  sent_via?: NotificationChannel[]
}

export interface NotificationFilter {
  type?: NotificationType
  severity?: NotificationSeverity
  is_read?: boolean
  start_date?: string
  end_date?: string
}
