-- invoicesテーブルにStripe Billing用のカラムを追加

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'stripe' CHECK (invoice_type IN ('manual', 'stripe')),
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'failed', 'pending')),
  ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('invoice', 'card')),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);

-- コメント追加
COMMENT ON COLUMN invoices.invoice_type IS '請求書タイプ（manual: 手動作成, stripe: Stripe自動生成）';
COMMENT ON COLUMN invoices.payment_status IS '支払ステータス（unpaid: 未払い, paid: 支払済み, failed: 失敗, pending: 保留中）';
COMMENT ON COLUMN invoices.payment_method IS '支払方法（invoice: 請求書払い, card: カード決済）';
COMMENT ON COLUMN invoices.stripe_payment_intent_id IS 'Stripe Payment Intent ID';
