-- ログイン試行履歴テーブル
-- 不正ログイン警告機能のため、ログイン失敗を記録

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL,
  ip_address VARCHAR(100) NOT NULL,
  user_agent TEXT,
  attempt_type VARCHAR(50) NOT NULL, -- 'password_failure', '2fa_failure', 'success'
  country_code VARCHAR(2), -- GeoIPから取得した国コード（例: 'JP', 'US'）
  location_info TEXT, -- GeoIPから取得した詳細情報
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_login_attempts_email ON login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX idx_login_attempts_email_created ON login_attempts(email, created_at DESC);

-- RLS無効（スーパーアドミン専用テーブルのため）
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- サービスロールのみアクセス可能（service_role_keyでのみ操作）
CREATE POLICY "Service role only" ON login_attempts
  FOR ALL
  USING (false);

-- コメント
COMMENT ON TABLE login_attempts IS 'スーパー管理者ログイン試行履歴（成功・失敗両方）';
COMMENT ON COLUMN login_attempts.email IS 'ログイン試行時のメールアドレス';
COMMENT ON COLUMN login_attempts.ip_address IS 'アクセス元IPアドレス';
COMMENT ON COLUMN login_attempts.attempt_type IS 'パスワード失敗/2FA失敗/成功';
COMMENT ON COLUMN login_attempts.country_code IS 'GeoIPから取得した国コード（例: JP, US）';
COMMENT ON COLUMN login_attempts.location_info IS 'GeoIPから取得した詳細位置情報（国-地域-都市）';
