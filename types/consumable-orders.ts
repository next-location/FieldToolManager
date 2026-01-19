// 消耗品発注管理の型定義

export type OrderStatus = '下書き中' | '発注済み' | '納品済み' | 'キャンセル'

export interface ConsumableOrder {
  id: string
  organization_id: string
  tool_id: string

  // 発注情報
  order_number: string
  order_date: string // ISO date string
  expected_delivery_date: string | null
  actual_delivery_date: string | null

  // 数量・金額
  quantity: number
  unit_price: number | null
  total_price: number | null

  // 発注先
  client_id: string | null // 取引先ID
  supplier_name: string | null // 後方互換性のため保持
  supplier_contact: string | null // 後方互換性のため保持

  // ステータス
  status: OrderStatus

  // メモ
  notes: string | null

  // 実行者
  ordered_by: string
  received_by: string | null

  // タイムスタンプ
  created_at: string
  updated_at: string
  deleted_at: string | null
}

// リレーション込みの発注情報
export interface ConsumableOrderWithRelations extends ConsumableOrder {
  tools: {
    id: string
    name: string
    model_number: string | null
    manufacturer: string | null
  } | null
  ordered_by_user: {
    id: string
    name: string
    email: string
  } | null
  received_by_user: {
    id: string
    name: string
    email: string
  } | null
  clients: {
    id: string
    name: string
    client_code: string | null
    payment_terms: string | null
  } | null
}

// 発注作成用の入力データ
export interface CreateConsumableOrderInput {
  tool_id: string
  order_number: string
  order_date: string
  expected_delivery_date?: string
  quantity: number
  unit_price?: number
  total_price?: number
  client_id?: string // 取引先ID
  supplier_name?: string // 後方互換性のため保持
  supplier_contact?: string // 後方互換性のため保持
  notes?: string
}

// 発注更新用の入力データ
export interface UpdateConsumableOrderInput {
  order_number?: string
  order_date?: string
  expected_delivery_date?: string
  actual_delivery_date?: string
  quantity?: number
  unit_price?: number
  total_price?: number
  supplier_name?: string
  supplier_contact?: string
  status?: OrderStatus
  received_by?: string
  notes?: string
}

// 発注統計情報
export interface OrderStatistics {
  total_orders: number
  pending_orders: number // 下書き中
  ordered_count: number // 発注済み
  delivered_count: number // 納品済み
  cancelled_count: number // キャンセル
  total_amount: number // 総発注額
  pending_delivery_count: number // 納品待ち数
}

// 消耗品別の発注サマリー
export interface ConsumableOrderSummary {
  tool_id: string
  tool_name: string
  total_ordered_quantity: number
  total_delivered_quantity: number
  pending_quantity: number
  last_order_date: string | null
  average_delivery_days: number | null
  total_cost: number
}
