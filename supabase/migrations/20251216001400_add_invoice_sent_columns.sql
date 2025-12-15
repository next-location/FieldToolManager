-- 請求書送付用カラムを追加
ALTER TABLE billing_invoices
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS sent_to_email TEXT;

COMMENT ON COLUMN billing_invoices.sent_at IS '顧客に送付した日時';
COMMENT ON COLUMN billing_invoices.sent_by IS '送付したユーザーID';
COMMENT ON COLUMN billing_invoices.sent_to_email IS '送付先メールアドレス';
