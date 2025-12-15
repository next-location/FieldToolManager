-- billing_invoices のステータスに 'submitted' を追加
ALTER TABLE billing_invoices
DROP CONSTRAINT IF EXISTS billing_invoices_status_check;

ALTER TABLE billing_invoices
ADD CONSTRAINT billing_invoices_status_check
CHECK (status IN ('draft', 'submitted', 'approved', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'));

COMMENT ON CONSTRAINT billing_invoices_status_check ON billing_invoices IS 'draft: 下書き, submitted: 提出済み(リーダー), approved: 承認済み(マネージャー), sent: 送付済み, partially_paid: 一部入金, paid: 入金済み, overdue: 期限超過, cancelled: キャンセル';
