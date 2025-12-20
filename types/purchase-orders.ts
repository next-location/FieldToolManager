// 発注書管理の型定義

export type PurchaseOrderStatus =
  | 'draft'           // 下書き
  | 'submitted'       // 承認申請中
  | 'approved'        // 承認済み
  | 'rejected'        // 差戻し
  | 'ordered'         // 発注済み
  | 'partially_received'  // 一部納品済み
  | 'received'        // 納品済み
  | 'paid'            // 支払済み
  | 'cancelled';      // キャンセル

export type PurchaseOrderItemType =
  | 'material'        // 材料
  | 'labor'           // 労務
  | 'subcontract'     // 外注
  | 'expense'         // 経費
  | 'other';          // その他

// Supplier型は廃止 - clientsテーブルを使用
// export interface Supplier は削除
// 代わりにClientインターフェースを使用（clients.tsから参照）

export interface PurchaseOrder {
  id: string;
  organization_id: string;
  order_number: string;
  client_id: string; // 変更: supplier_id → client_id
  project_id?: string;
  order_date: string;
  delivery_date?: string;
  delivery_location?: string;
  payment_terms?: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  status: PurchaseOrderStatus;
  notes?: string; // 発注備考（仕入先向け）
  internal_memo?: string; // 変更: internal_notes → internal_memo（社内メモ）
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  rejected_by?: string; // 追加: 差戻し者
  rejected_at?: string; // 追加: 差戻し日時
  rejection_reason?: string; // 追加: 差戻し理由
  ordered_at?: string;
  delivered_at?: string;
  paid_at?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  sort_order: number; // 変更: display_order → sort_order
  item_type: PurchaseOrderItemType;
  item_code?: string;
  item_name: string;
  description?: string;
  quantity: number;
  unit: string;
  unit_price: number;
  amount: number;
  tax_rate: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderHistory {
  id: string;
  purchase_order_id: string;
  action: string;
  old_status?: PurchaseOrderStatus;
  new_status?: PurchaseOrderStatus;
  comment?: string;
  created_by: string;
  created_at: string;
}

// フロントエンド用の拡張型（関連データ含む）
export interface PurchaseOrderWithRelations extends PurchaseOrder {
  client?: { // 変更: supplier → client
    id: string;
    name: string;
    client_code: string;
  };
  project?: {
    id: string;
    name: string;
  };
  items?: PurchaseOrderItem[];
  history?: PurchaseOrderHistory[];
  created_by_user?: {
    id: string;
    name: string;
  };
  approved_by_user?: {
    id: string;
    name: string;
  };
  rejected_by_user?: { // 追加: 差戻したユーザー
    id: string;
    name: string;
  };
}

// フォーム用の型
export interface PurchaseOrderFormData {
  client_id: string; // 変更: supplier_id → client_id
  project_id?: string;
  order_date: string;
  delivery_date?: string;
  delivery_location?: string;
  payment_terms?: string;
  notes?: string;
  internal_memo?: string; // 変更: internal_notes → internal_memo
  items: {
    item_type: PurchaseOrderItemType;
    item_code?: string;
    item_name: string;
    description?: string;
    quantity: number;
    unit: string;
    unit_price: number;
    tax_rate: number;
  }[];
}

// 検索フィルター用の型
export interface PurchaseOrderFilters {
  status?: PurchaseOrderStatus | PurchaseOrderStatus[];
  client_id?: string; // 変更: supplier_id → client_id
  project_id?: string;
  order_date_from?: string;
  order_date_to?: string;
  total_amount_min?: number;
  total_amount_max?: number;
  created_by?: string;
  search_text?: string;
}

// ページネーション用の型
export interface PurchaseOrderListResponse {
  data: PurchaseOrderWithRelations[];
  total: number;
  page: number;
  page_size: number;
}

// 統計情報用の型
export interface PurchaseOrderStats {
  total_count: number;
  draft_count: number;
  submitted_count: number;
  approved_count: number;
  ordered_count: number;
  received_count: number;
  paid_count: number;
  total_amount: number;
  unpaid_amount: number;
}
