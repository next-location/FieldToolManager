-- 見積もり既読管理テーブルを作成
CREATE TABLE IF NOT EXISTS estimate_reads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- 1人のユーザーが同じ見積もりを複数回既読にしないように
  UNIQUE(estimate_id, user_id)
);

-- インデックス作成
CREATE INDEX idx_estimate_reads_estimate ON estimate_reads(estimate_id);
CREATE INDEX idx_estimate_reads_user ON estimate_reads(user_id);
CREATE INDEX idx_estimate_reads_org ON estimate_reads(organization_id);

-- RLSポリシー設定
ALTER TABLE estimate_reads ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の既読情報を閲覧可能
CREATE POLICY "Users can view their own estimate reads"
  ON estimate_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分の既読情報を記録可能
CREATE POLICY "Users can insert their own estimate reads"
  ON estimate_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- コメント追加
COMMENT ON TABLE estimate_reads IS '見積書の既読管理（マネージャー・管理者用）';
COMMENT ON COLUMN estimate_reads.estimate_id IS '既読した見積書ID';
COMMENT ON COLUMN estimate_reads.user_id IS '既読したユーザーID';
COMMENT ON COLUMN estimate_reads.read_at IS '既読日時';
