// 監査ログの型定義

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'view'
  | 'login'
  | 'logout'
  | 'export'
  | 'password_change'
  | 'password_reset'
  | 'send'
  | 'approve'
  | 'reject'
  | 'submit'
  | 'move'
  | 'checkout'
  | 'checkin'
  | 'transfer'
  | 'adjust'
  | 'add'
  | 'remove'
  | 'receive'
  | 'pay'
  | 'payment'

export interface AuditLog {
  id: string
  organization_id: string
  action: AuditAction
  entity_type: string // 'tools', 'users', 'organizations', etc.
  entity_id: string | null
  old_values: Record<string, any> | null
  new_values: Record<string, any> | null
  user_id: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface CreateAuditLogParams {
  action: AuditAction
  entity_type: string
  entity_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string
  user_agent?: string
}
