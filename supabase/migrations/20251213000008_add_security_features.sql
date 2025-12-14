-- ログイン試行履歴テーブル
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(100),
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_time ON login_attempts(attempted_at);

-- アカウントロックアウトテーブル
CREATE TABLE IF NOT EXISTS account_lockouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  locked_until TIMESTAMPTZ NOT NULL,
  reason VARCHAR(100) DEFAULT 'too_many_attempts',
  unlocked_at TIMESTAMPTZ,
  unlocked_by UUID REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_account_lockouts_user_id ON account_lockouts(user_id);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_email ON account_lockouts(email);
CREATE INDEX IF NOT EXISTS idx_account_lockouts_locked_until ON account_lockouts(locked_until);

-- パスワード履歴テーブル（再利用防止）
CREATE TABLE IF NOT EXISTS password_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_password_history_user_id ON password_history(user_id);
CREATE INDEX IF NOT EXISTS idx_password_history_created_at ON password_history(created_at);

-- パスワード有効期限管理（usersテーブルに列を追加）
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS force_password_change BOOLEAN DEFAULT false;

-- 古いログイン試行履歴の自動削除（30日以上前）
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void AS $$
BEGIN
  DELETE FROM login_attempts WHERE attempted_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 古いパスワード履歴の自動削除（ユーザーごとに最新10件のみ保持）
CREATE OR REPLACE FUNCTION cleanup_old_password_history()
RETURNS void AS $$
BEGIN
  DELETE FROM password_history
  WHERE id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
      FROM password_history
    ) t
    WHERE t.rn <= 10
  );
END;
$$ LANGUAGE plpgsql;

-- 監査ログの自動削除関数（保持期間を超えたログを削除）
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(retention_days INT DEFAULT 365)
RETURNS void AS $$
BEGIN
  DELETE FROM audit_logs WHERE created_at < NOW() - (retention_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- RLS ポリシー
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_lockouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- 管理者のみが参照可能
CREATE POLICY "Admins can view login attempts" ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage lockouts" ON account_lockouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ユーザーは自分のパスワード履歴のみ参照可能
CREATE POLICY "Users can view own password history" ON password_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE login_attempts IS 'ログイン試行履歴';
COMMENT ON TABLE account_lockouts IS 'アカウントロックアウト管理';
COMMENT ON TABLE password_history IS 'パスワード履歴（再利用防止）';
COMMENT ON COLUMN users.password_changed_at IS 'パスワード最終変更日時';
COMMENT ON COLUMN users.password_expires_at IS 'パスワード有効期限';
COMMENT ON COLUMN users.force_password_change IS '次回ログイン時に強制的にパスワード変更';
