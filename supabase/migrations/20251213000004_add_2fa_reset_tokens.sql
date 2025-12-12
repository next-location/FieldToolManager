-- 2FAリセットトークンテーブル
CREATE TABLE two_factor_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- インデックス
CREATE INDEX idx_two_factor_reset_tokens_token ON two_factor_reset_tokens(token);
CREATE INDEX idx_two_factor_reset_tokens_user_id ON two_factor_reset_tokens(user_id);
CREATE INDEX idx_two_factor_reset_tokens_expires_at ON two_factor_reset_tokens(expires_at);

-- 2FAリセット履歴テーブル
CREATE TABLE two_factor_reset_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  reset_by UUID REFERENCES users(id),
  reset_type TEXT NOT NULL, -- 'self', 'admin', 'super_admin'
  reset_reason TEXT,
  token_id UUID REFERENCES two_factor_reset_tokens(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

-- usersテーブルに2FA関連カラムを追加（まだない場合）
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes_used TEXT[] DEFAULT '{}';

-- RLSポリシー
ALTER TABLE two_factor_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_reset_logs ENABLE ROW LEVEL SECURITY;

-- ユーザー自身のトークンのみアクセス可能
CREATE POLICY "Users can view their own reset tokens" ON two_factor_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は組織内のリセットログを閲覧可能
CREATE POLICY "Admins can view organization reset logs" ON two_factor_reset_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'leader')
      AND users.organization_id = (
        SELECT organization_id FROM users WHERE id = two_factor_reset_logs.user_id
      )
    )
  );