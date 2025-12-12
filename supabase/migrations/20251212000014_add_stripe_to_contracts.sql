-- contractsテーブルにStripe関連フィールドを追加
-- A方式（Invoice Item方式）実装のため

-- ========================================
-- contractsテーブルにStripe関連列を追加
-- ========================================
ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_day INTEGER DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS monthly_base_fee NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS has_both_packages BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS initial_fee NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_month_discount NUMERIC(10, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS user_count INTEGER DEFAULT 10;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_contracts_stripe_customer_id ON contracts(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_billing_day ON contracts(billing_day);
CREATE INDEX IF NOT EXISTS idx_contracts_status_billing_day ON contracts(status, billing_day);

-- コメント追加
COMMENT ON COLUMN contracts.stripe_customer_id IS 'Stripe Customer ID (cus_xxx)';
COMMENT ON COLUMN contracts.billing_day IS '毎月の請求日（1-28日）';
COMMENT ON COLUMN contracts.monthly_base_fee IS '基本プラン月額料金（人数ベース）';
COMMENT ON COLUMN contracts.has_both_packages IS 'フル機能統合パック（両方のパッケージを含む）';
COMMENT ON COLUMN contracts.initial_fee IS '初期費用（初回のみ）';
COMMENT ON COLUMN contracts.first_month_discount IS '初月割引額（初回のみ）';
COMMENT ON COLUMN contracts.user_count IS 'ユーザー数';
