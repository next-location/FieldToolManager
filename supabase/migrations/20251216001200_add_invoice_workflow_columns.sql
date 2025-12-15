-- 請求書ワークフロー用カラムを追加
ALTER TABLE billing_invoices
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS manager_approved_by UUID REFERENCES users(id);

COMMENT ON COLUMN billing_invoices.submitted_at IS 'リーダーが提出した日時';
COMMENT ON COLUMN billing_invoices.submitted_by IS 'リーダーが提出したユーザーID';
COMMENT ON COLUMN billing_invoices.manager_approved_at IS 'マネージャーが承認した日時';
COMMENT ON COLUMN billing_invoices.manager_approved_by IS 'マネージャーが承認したユーザーID';
