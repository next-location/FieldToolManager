-- organization_backups テーブル
CREATE TABLE IF NOT EXISTS organization_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL, -- 'full', 'incremental'
  file_path TEXT NOT NULL,
  file_size_mb NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_organization_backups_org_id ON organization_backups(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_backups_created_at ON organization_backups(created_at DESC);

-- RLSポリシー
ALTER TABLE organization_backups ENABLE ROW LEVEL SECURITY;

-- 組織内のユーザーは自組織のバックアップを閲覧可能
CREATE POLICY "organization_backups_select_policy" ON organization_backups
  FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 組織のadminユーザーはバックアップを作成可能
CREATE POLICY "organization_backups_insert_policy" ON organization_backups
  FOR INSERT
  WITH CHECK (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- コメント追加
COMMENT ON TABLE organization_backups IS '組織データのバックアップ履歴';
COMMENT ON COLUMN organization_backups.backup_type IS 'バックアップタイプ: full（全体）, incremental（差分）';
COMMENT ON COLUMN organization_backups.status IS 'ステータス: completed（完了）, failed（失敗）';
