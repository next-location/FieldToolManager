-- 2FA猶予期間管理用のテーブル
CREATE TABLE IF NOT EXISTS two_factor_grace_periods (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 猶予期間の設定
  grace_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  grace_end_date TIMESTAMPTZ NOT NULL,

  -- 状態管理
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'exempted')),
  reminder_count INT DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,

  -- 2FA設定完了時の記録
  completed_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_2fa_grace_user_id ON two_factor_grace_periods(user_id);
CREATE INDEX idx_2fa_grace_org_id ON two_factor_grace_periods(organization_id);
CREATE INDEX idx_2fa_grace_status ON two_factor_grace_periods(status);
CREATE INDEX idx_2fa_grace_end_date ON two_factor_grace_periods(grace_end_date);

-- 一意制約（1ユーザーに1つの有効な猶予期間）
CREATE UNIQUE INDEX idx_2fa_grace_unique_active
  ON two_factor_grace_periods(user_id)
  WHERE status IN ('pending');

-- 2FAトークン管理テーブル（メールベース2FA用）
CREATE TABLE IF NOT EXISTS two_factor_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- トークン情報
  token VARCHAR(10) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('totp', 'email', 'sms')),
  email VARCHAR(255),
  phone VARCHAR(50),

  -- 用途
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('login', 'setup', 'verify', 'reset')),

  -- 有効期限
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_2fa_tokens_user_id ON two_factor_tokens(user_id);
CREATE INDEX idx_2fa_tokens_token ON two_factor_tokens(token);
CREATE INDEX idx_2fa_tokens_expires ON two_factor_tokens(expires_at);

-- 期限切れトークンの自動削除（1日1回実行される想定）
CREATE OR REPLACE FUNCTION cleanup_expired_2fa_tokens()
RETURNS void AS $$
BEGIN
  DELETE FROM two_factor_tokens WHERE expires_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql;

-- RLS ポリシー
ALTER TABLE two_factor_grace_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE two_factor_tokens ENABLE ROW LEVEL SECURITY;

-- 猶予期間ポリシー（ユーザーは自分の猶予期間のみ参照可能）
CREATE POLICY "Users can view own grace period" ON two_factor_grace_periods
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 猶予期間ポリシー（管理者は組織内の猶予期間を管理可能）
CREATE POLICY "Admins can manage organization grace periods" ON two_factor_grace_periods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = two_factor_grace_periods.organization_id
      AND role = 'admin'
    )
  );

-- トークンポリシー（ユーザーは自分のトークンのみ操作可能）
CREATE POLICY "Users can manage own tokens" ON two_factor_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE two_factor_grace_periods IS '2FA必須化時の猶予期間管理';
COMMENT ON COLUMN two_factor_grace_periods.status IS 'pending: 猶予期間中, completed: 2FA設定完了, expired: 猶予期間切れ, exempted: 免除';
COMMENT ON COLUMN two_factor_grace_periods.reminder_count IS 'リマインダー送信回数';

COMMENT ON TABLE two_factor_tokens IS '2FA一時トークン管理（メール、SMS用）';
COMMENT ON COLUMN two_factor_tokens.type IS 'totp: TOTP, email: メール, sms: SMS';
COMMENT ON COLUMN two_factor_tokens.purpose IS 'login: ログイン, setup: 初期設定, verify: 確認, reset: リセット';