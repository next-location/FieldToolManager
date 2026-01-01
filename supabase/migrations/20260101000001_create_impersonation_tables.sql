-- スーパーアドミン ワンクリックログイン機能用テーブル

-- UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. なりすましトークンテーブル（5分間有効、使い捨て）
CREATE TABLE impersonation_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_impersonation_tokens_token ON impersonation_tokens(token);
CREATE INDEX idx_impersonation_tokens_expires ON impersonation_tokens(expires_at);

-- 2. なりすましセッションテーブル（30分間アイドルタイムアウト）
CREATE TABLE impersonation_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_impersonation_sessions_token ON impersonation_sessions(session_token);
CREATE INDEX idx_impersonation_sessions_expires ON impersonation_sessions(expires_at);
CREATE INDEX idx_impersonation_sessions_admin ON impersonation_sessions(super_admin_id);

-- 3. なりすましアクセスログテーブル（監査証跡）
CREATE TABLE impersonation_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'token_generated', 'login', 'logout'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_impersonation_logs_admin ON impersonation_access_logs(super_admin_id);
CREATE INDEX idx_impersonation_logs_org ON impersonation_access_logs(organization_id);
CREATE INDEX idx_impersonation_logs_created ON impersonation_access_logs(created_at DESC);

-- RLSポリシーは設定しない（SERVICE_ROLE_KEYでアクセスするため）
