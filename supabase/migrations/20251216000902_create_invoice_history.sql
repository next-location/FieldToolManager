-- 請求書操作履歴テーブルを作成
CREATE TABLE IF NOT EXISTS invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',
    'draft_saved',
    'submitted',
    'approved',
    'returned',
    'sent',
    'pdf_generated',
    'payment_recorded',
    'payment_completed'
  )),
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_by_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_invoice_history_invoice_id ON invoice_history(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_organization_id ON invoice_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoice_history_created_at ON invoice_history(created_at DESC);

-- RLSを有効化
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

-- ポリシーを作成
CREATE POLICY "Users can view invoice history in their organization"
  ON invoice_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoice history in their organization"
  ON invoice_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- コメントを追加
COMMENT ON TABLE invoice_history IS '請求書の操作履歴を記録するテーブル';
COMMENT ON COLUMN invoice_history.action_type IS '操作種別: created, draft_saved, submitted, approved, returned, sent, pdf_generated, payment_recorded, payment_completed';
COMMENT ON COLUMN invoice_history.performed_by_name IS 'ユーザー名のスナップショット（削除後も表示可能）';
