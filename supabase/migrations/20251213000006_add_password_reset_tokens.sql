-- パスワードリセットトークンテーブル
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token) WHERE NOT used;
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at) WHERE NOT used;

-- RLS有効化
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（サービスロールのみアクセス可能）
CREATE POLICY "Service role can manage password reset tokens"
  ON password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- コメント
COMMENT ON TABLE password_reset_tokens IS 'パスワードリセットトークン管理テーブル';
COMMENT ON COLUMN password_reset_tokens.id IS 'トークンID';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ユーザーID';
COMMENT ON COLUMN password_reset_tokens.token IS 'リセットトークン（ハッシュ化）';
COMMENT ON COLUMN password_reset_tokens.expires_at IS '有効期限';
COMMENT ON COLUMN password_reset_tokens.used IS '使用済みフラグ';
COMMENT ON COLUMN password_reset_tokens.created_at IS '作成日時';
COMMENT ON COLUMN password_reset_tokens.used_at IS '使用日時';
