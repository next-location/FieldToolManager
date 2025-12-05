-- 作業報告書関連の通知タイプを追加
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'low_stock',
  'unreturned_tool',
  'monthly_inventory',
  'maintenance_due',
  'tool_created',
  'tool_updated',
  'tool_deleted',
  'user_invited',
  'contract_expiring',
  'system_announcement',
  -- 作業報告書関連
  'work_report_submitted',  -- 作業報告書が提出された
  'work_report_approved',   -- 作業報告書が承認された
  'work_report_rejected'    -- 作業報告書が却下された
));

-- related_work_report_id カラムを追加（既存データとの互換性のためNULL許容）
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_work_report_id UUID REFERENCES work_reports(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_notifications_related_work_report_id ON notifications(related_work_report_id);

COMMENT ON COLUMN notifications.related_work_report_id IS '関連する作業報告書ID';
