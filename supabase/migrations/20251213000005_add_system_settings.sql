-- システム設定テーブル（キー・バリュー形式）
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES super_admins(id)
);

-- インデックス
CREATE INDEX idx_system_settings_key ON system_settings(key);

-- デフォルトのセキュリティ設定を挿入
INSERT INTO system_settings (key, value, description) VALUES
  ('security_settings', '{
    "passwordMinLength": 8,
    "passwordRequireUppercase": true,
    "passwordRequireLowercase": true,
    "passwordRequireNumbers": true,
    "passwordRequireSpecialChars": true,
    "passwordExpirationDays": 90,
    "maxLoginAttempts": 5,
    "lockoutDurationMinutes": 30,
    "sessionTimeoutMinutes": 60,
    "enableIpRestriction": false,
    "allowedIpAddresses": [],
    "require2FAForAdmins": false,
    "require2FAForAllUsers": false,
    "auditLogRetentionDays": 365
  }'::jsonb, 'システム全体のセキュリティ設定')
ON CONFLICT (key) DO NOTHING;

-- ログイン試行記録テーブル
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  super_admin_id UUID REFERENCES super_admins(id),
  success BOOLEAN NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  failure_reason TEXT
);

-- インデックス
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_user_id ON login_attempts(user_id);
CREATE INDEX idx_login_attempts_super_admin_id ON login_attempts(super_admin_id);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- アカウントロックテーブル
CREATE TABLE IF NOT EXISTS account_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  super_admin_id UUID REFERENCES super_admins(id),
  locked_at TIMESTAMPTZ DEFAULT NOW(),
  unlock_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  ip_address TEXT
);

-- インデックス
CREATE INDEX idx_account_locks_email ON account_locks(email);
CREATE INDEX idx_account_locks_unlock_at ON account_locks(unlock_at);

-- パスワード履歴テーブル（再利用防止）
CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  super_admin_id UUID REFERENCES super_admins(id),
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_super_admin_id ON password_history(super_admin_id);
CREATE INDEX idx_password_history_created_at ON password_history(created_at);

-- RLSポリシー
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_history ENABLE ROW LEVEL SECURITY;

-- スーパー管理者のみシステム設定にアクセス可能
CREATE POLICY "Super admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE id = auth.uid()
    )
  );

-- ログイン試行記録は挿入のみ可能
CREATE POLICY "Anyone can insert login attempts" ON login_attempts
  FOR INSERT WITH CHECK (true);

-- スーパー管理者はログイン試行記録を閲覧可能
CREATE POLICY "Super admins can view login attempts" ON login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE id = auth.uid()
    )
  );