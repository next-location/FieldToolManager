-- Stripe Billing統合のためのデータベース拡張
-- 実装計画書: docs/STRIPE_BILLING_IMPLEMENTATION_PLAN.md

-- ========================================
-- organizationsテーブルの拡張
-- ========================================
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_cycle_day INTEGER DEFAULT 1 CHECK (billing_cycle_day BETWEEN 1 AND 28),
  ADD COLUMN IF NOT EXISTS initial_setup_fee_paid BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'invoice' CHECK (payment_method IN ('invoice', 'card'));

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_stripe_subscription_id ON organizations(stripe_subscription_id);

-- ========================================
-- stripe_eventsテーブル（Webhookイベント記録）
-- ========================================
CREATE TABLE IF NOT EXISTS stripe_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_stripe_events_event_type ON stripe_events(event_type);
CREATE INDEX IF NOT EXISTS idx_stripe_events_processed ON stripe_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_events_created_at ON stripe_events(created_at);

COMMENT ON TABLE stripe_events IS 'Stripe Webhookイベントの記録（重複処理防止・監査ログ）';
COMMENT ON COLUMN stripe_events.stripe_event_id IS 'Stripe Event ID（evt_xxx）';
COMMENT ON COLUMN stripe_events.event_type IS 'イベントタイプ（invoice.created, payment_succeeded等）';
COMMENT ON COLUMN stripe_events.data IS 'イベントデータ（JSONB）';
COMMENT ON COLUMN stripe_events.processed IS '処理完了フラグ';
COMMENT ON COLUMN stripe_events.retry_count IS 'リトライ回数';

-- ========================================
-- plan_change_requestsテーブル（プラン変更申請）
-- ========================================
CREATE TABLE IF NOT EXISTS plan_change_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  current_plan TEXT NOT NULL,
  requested_plan TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('upgrade', 'downgrade')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled')),
  stripe_subscription_id TEXT,
  proration_amount DECIMAL(10, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_plan_change_requests_organization_id ON plan_change_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_plan_change_requests_status ON plan_change_requests(status);
CREATE INDEX IF NOT EXISTS idx_plan_change_requests_scheduled_for ON plan_change_requests(scheduled_for);

COMMENT ON TABLE plan_change_requests IS 'プラン変更申請（アップグレード・ダウングレード）';
COMMENT ON COLUMN plan_change_requests.change_type IS 'upgrade: 即日適用、downgrade: 30日前通知必須';
COMMENT ON COLUMN plan_change_requests.proration_amount IS '日割り計算金額（アップグレード時）';

-- ========================================
-- invoice_schedulesテーブル（請求スケジュール）
-- ========================================
CREATE TABLE IF NOT EXISTS invoice_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  billing_day INTEGER NOT NULL CHECK (billing_day BETWEEN 1 AND 28),
  is_active BOOLEAN DEFAULT true,
  next_invoice_date DATE NOT NULL,
  next_amount DECIMAL(10, 2) NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  stripe_price_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_invoice_schedules_organization_id ON invoice_schedules(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_schedules_next_invoice_date ON invoice_schedules(next_invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_schedules_is_active ON invoice_schedules(is_active);

COMMENT ON TABLE invoice_schedules IS '次回請求スケジュール';
COMMENT ON COLUMN invoice_schedules.billing_day IS '毎月の請求日（1-28日）';
COMMENT ON COLUMN invoice_schedules.next_invoice_date IS '次回請求予定日';

-- ========================================
-- updated_atトリガー
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_plan_change_requests_updated_at
  BEFORE UPDATE ON plan_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_schedules_updated_at
  BEFORE UPDATE ON invoice_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- Row Level Security (RLS)
-- ========================================

-- stripe_events: Super Adminのみ閲覧可能
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super Admin can view all stripe events"
  ON stripe_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- plan_change_requests: 自組織のみ閲覧・作成可能
ALTER TABLE plan_change_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization plan change requests"
  ON plan_change_requests
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admin can create plan change requests"
  ON plan_change_requests
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- invoice_schedules: 自組織のみ閲覧可能
ALTER TABLE invoice_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization invoice schedules"
  ON invoice_schedules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- ========================================
-- 既存のinvoicesテーブルにstripe_invoice_id追加
-- ========================================
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_invoices_stripe_invoice_id ON invoices(stripe_invoice_id);

COMMENT ON COLUMN invoices.stripe_invoice_id IS 'Stripe Invoice ID（in_xxx）';
