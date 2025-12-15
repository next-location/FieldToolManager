-- billing_invoicesテーブルに承認・送付関連カラムを追加

-- 承認関連カラム
ALTER TABLE billing_invoices
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES users(id);

-- 送付関連カラム
ALTER TABLE billing_invoices
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id);

-- コメントを追加
COMMENT ON COLUMN billing_invoices.manager_approved_at IS 'マネージャーによる承認日時';
COMMENT ON COLUMN billing_invoices.manager_approved_by IS 'マネージャーによる承認者ID';
COMMENT ON COLUMN billing_invoices.sent_at IS '顧客への送付日時';
COMMENT ON COLUMN billing_invoices.sent_by IS '送付実行者ID';
