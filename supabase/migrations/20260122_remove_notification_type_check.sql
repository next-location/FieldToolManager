-- 通知タイプのCHECK制約を削除して、新しい通知タイプを自由に追加できるようにする
-- 2026-01-22

-- 既存のCHECK制約を削除
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- typeカラムはTEXT NOT NULLのままで、CHECK制約なし
-- これにより estimate_returned, estimate_submitted などの新しいタイプを自由に使用可能

-- コメント追加
COMMENT ON COLUMN notifications.type IS '通知タイプ（制約なし）: low_stock, unreturned_tool, monthly_inventory, maintenance_due, tool_created, tool_updated, tool_deleted, user_invited, contract_expiring, system_announcement, estimate_submitted, estimate_returned, estimate_approved, estimate_customer_approved, estimate_customer_rejected, work_report_submitted, work_report_approved, work_report_rejected, purchase_order_approved, purchase_order_rejected など';
