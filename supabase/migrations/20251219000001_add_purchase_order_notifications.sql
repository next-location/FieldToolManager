-- notificationsテーブルに発注書用のカラムとタイプを追加

-- 発注書関連のカラムを追加
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_purchase_order_id UUID REFERENCES purchase_orders(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_notifications_related_purchase_order_id ON notifications(related_purchase_order_id);

-- typeの制約を削除して再作成（発注書用のタイプを追加）
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'low_stock'::text,
  'unreturned_tool'::text,
  'monthly_inventory'::text,
  'maintenance_due'::text,
  'tool_created'::text,
  'tool_updated'::text,
  'tool_deleted'::text,
  'user_invited'::text,
  'contract_expiring'::text,
  'system_announcement'::text,
  'work_report_submitted'::text,
  'work_report_approved'::text,
  'work_report_rejected'::text,
  'estimate_approved'::text,
  'estimate_returned'::text,
  'estimate_customer_approved'::text,
  'estimate_customer_rejected'::text,
  'purchase_order_approved'::text,
  'purchase_order_rejected'::text
]));

-- コメント追加
COMMENT ON COLUMN notifications.related_purchase_order_id IS '関連発注書ID';
