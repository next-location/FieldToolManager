-- 見積もり操作履歴テーブルを作成
CREATE TABLE IF NOT EXISTS estimate_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'created',
    'draft_saved',
    'submitted',
    'approved',
    'returned',
    'sent',
    'pdf_generated',
    'customer_approved',
    'customer_rejected'
  )),
  performed_by UUID REFERENCES users(id),
  performed_by_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_estimate_history_estimate ON estimate_history(estimate_id);
CREATE INDEX idx_estimate_history_org ON estimate_history(organization_id);
CREATE INDEX idx_estimate_history_created_at ON estimate_history(created_at DESC);

-- RLSポリシー設定
ALTER TABLE estimate_history ENABLE ROW LEVEL SECURITY;

-- 組織内のユーザーは履歴を閲覧可能
CREATE POLICY "Users can view estimate history in their organization"
  ON estimate_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- システムからの履歴記録を許可（アプリケーションレベルで制御）
CREATE POLICY "Allow insert estimate history"
  ON estimate_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- コメント追加
COMMENT ON TABLE estimate_history IS '見積書の操作履歴を記録';
COMMENT ON COLUMN estimate_history.action_type IS '操作種別: created, draft_saved, submitted, approved, returned, sent, pdf_generated, customer_approved, customer_rejected';
COMMENT ON COLUMN estimate_history.performed_by IS '操作を行ったユーザーID';
COMMENT ON COLUMN estimate_history.performed_by_name IS '操作を行ったユーザー名（削除された場合でも履歴として残す）';
COMMENT ON COLUMN estimate_history.notes IS '操作に関する追加情報（差し戻し理由など）';
