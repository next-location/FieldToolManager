-- ========================================
-- スーパーアドミン通知テーブル
-- ========================================
-- システム管理者向けの通知（Resend使用量アラートなど）

CREATE TABLE IF NOT EXISTS super_admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 通知内容
  type TEXT NOT NULL CHECK (type IN (
    'resend_usage_warning',    -- Resend使用量80%警告
    'resend_usage_critical',   -- Resend使用量90%緊急
    'resend_usage_danger',     -- Resend使用量97%危険
    'system_error',            -- システムエラー
    'contract_created',        -- 契約作成通知
    'contract_completed',      -- 契約完了通知
    'organization_created',    -- 組織作成通知
    'system_announcement'      -- システムお知らせ
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),

  -- メタデータ（JSONで詳細情報を保存）
  metadata JSONB DEFAULT '{}',

  -- 既読ステータス
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  read_by UUID REFERENCES super_admins(id),

  -- タイムスタンプ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- インデックス作成
CREATE INDEX idx_super_admin_notifications_type ON super_admin_notifications(type);
CREATE INDEX idx_super_admin_notifications_severity ON super_admin_notifications(severity);
CREATE INDEX idx_super_admin_notifications_is_read ON super_admin_notifications(is_read);
CREATE INDEX idx_super_admin_notifications_created_at ON super_admin_notifications(created_at DESC);
CREATE INDEX idx_super_admin_notifications_deleted_at ON super_admin_notifications(deleted_at) WHERE deleted_at IS NULL;

-- コメント
COMMENT ON TABLE super_admin_notifications IS 'スーパーアドミン向け通知（Resend使用量アラート、システム通知など）';
COMMENT ON COLUMN super_admin_notifications.type IS '通知タイプ';
COMMENT ON COLUMN super_admin_notifications.severity IS '重要度（info/warning/error/critical）';
COMMENT ON COLUMN super_admin_notifications.metadata IS '追加情報（JSON形式）';
COMMENT ON COLUMN super_admin_notifications.is_read IS '既読フラグ';

-- ========================================
-- メール送信ログテーブル
-- ========================================
-- Resend使用量追跡用

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- メール情報
  email_type TEXT NOT NULL CHECK (email_type IN (
    'welcome',           -- ウェルカムメール（契約完了時）
    'contact',           -- お問い合わせ
    'support',           -- サポート問い合わせ
    'notification'       -- 取引先通知
  )),
  to_email TEXT NOT NULL,
  from_email TEXT,
  subject TEXT,

  -- 送信情報
  provider TEXT DEFAULT 'resend' CHECK (provider IN ('resend', 'smtp', 'other')),
  success BOOLEAN DEFAULT true,
  error_message TEXT,

  -- メタデータ
  metadata JSONB DEFAULT '{}',

  -- タイムスタンプ
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  year_month TEXT GENERATED ALWAYS AS (TO_CHAR(sent_at, 'YYYY-MM')) STORED
);

-- インデックス作成
CREATE INDEX idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX idx_email_logs_provider ON email_logs(provider);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
CREATE INDEX idx_email_logs_year_month ON email_logs(year_month);
CREATE INDEX idx_email_logs_success ON email_logs(success);

-- コメント
COMMENT ON TABLE email_logs IS 'メール送信ログ（Resend使用量追跡用）';
COMMENT ON COLUMN email_logs.email_type IS 'メールの種類';
COMMENT ON COLUMN email_logs.provider IS '送信プロバイダー（resend/smtp）';
COMMENT ON COLUMN email_logs.year_month IS '年月（YYYY-MM形式、月次集計用）';
COMMENT ON COLUMN email_logs.success IS '送信成功フラグ';
