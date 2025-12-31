-- パスワード変更確認コード管理テーブル
CREATE TABLE IF NOT EXISTS password_change_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id UUID REFERENCES super_admins(id) ON DELETE CASCADE NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_password_change_tokens_admin ON password_change_tokens(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_password_change_tokens_expires ON password_change_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_change_tokens_used ON password_change_tokens(used);

-- RLSポリシー有効化
ALTER TABLE password_change_tokens ENABLE ROW LEVEL SECURITY;

-- サービスロールのみアクセス可能
CREATE POLICY "Service role can manage password_change_tokens"
  ON password_change_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- コメント
COMMENT ON TABLE password_change_tokens IS 'スーパー管理者のパスワード変更時のメール確認コード管理';
COMMENT ON COLUMN password_change_tokens.super_admin_id IS '対象スーパー管理者ID';
COMMENT ON COLUMN password_change_tokens.token IS '6桁の確認コード';
COMMENT ON COLUMN password_change_tokens.expires_at IS '有効期限（10分）';
COMMENT ON COLUMN password_change_tokens.used IS '使用済みフラグ';
