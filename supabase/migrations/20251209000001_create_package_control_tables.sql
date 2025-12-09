-- パッケージ制御システム: テーブル作成
-- 作成日: 2025-12-09

-- ===================================
-- 1. 既存契約テーブルの拡張
-- ===================================
-- パッケージ選択カラムを追加
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS has_asset_package BOOLEAN DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS has_dx_efficiency_package BOOLEAN DEFAULT false;

-- プランタイプを追加（既存のplanカラムとは別）
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS plan_type TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 10;

-- 料金カラムを追加
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS base_monthly_fee DECIMAL(10, 2);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS package_monthly_fee DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS total_monthly_fee DECIMAL(10, 2);

-- 既存のstart_date/end_dateのエイリアス用カラム
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_start_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_end_date DATE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billing_cycle TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS trial_end_date DATE;

-- 作成者・更新者
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);

-- 既存データの初期化
UPDATE contracts SET
  plan_type = plan,
  user_limit = 10,
  base_monthly_fee = monthly_fee,
  package_monthly_fee = 0,
  total_monthly_fee = monthly_fee,
  contract_start_date = start_date,
  contract_end_date = end_date,
  billing_cycle = contract_type,
  has_asset_package = true,  -- 既存契約は全機能有効と仮定
  has_dx_efficiency_package = true
WHERE plan_type IS NULL;

COMMENT ON COLUMN contracts.has_asset_package IS '現場資産パック契約フラグ';
COMMENT ON COLUMN contracts.has_dx_efficiency_package IS '現場DX業務効率化パック契約フラグ';

-- ===================================
-- 2. 機能フラグテーブル
-- ===================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  enabled_until DATE, -- 期間限定機能用
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, feature_key)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_feature_flags_organization_id ON feature_flags(organization_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_feature_key ON feature_flags(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_is_enabled ON feature_flags(is_enabled);

-- RLS有効化
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'feature_flags' AND policyname = 'Organizations can view their own feature flags'
  ) THEN
    CREATE POLICY "Organizations can view their own feature flags"
      ON feature_flags FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

COMMENT ON TABLE feature_flags IS '機能フラグテーブル - 組織ごとの詳細な機能制御';

-- ===================================
-- 3. 契約履歴テーブル
-- ===================================
CREATE TABLE IF NOT EXISTS contract_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'upgraded', 'downgraded', 'renewed', 'suspended', 'cancelled')),

  -- 変更前後の内容
  previous_state JSONB,
  new_state JSONB,

  -- 変更理由
  reason TEXT,

  -- メタデータ
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  performed_by UUID REFERENCES users(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_contract_history_contract_id ON contract_history(contract_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_organization_id ON contract_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_contract_history_performed_at ON contract_history(performed_at DESC);

-- RLS有効化
ALTER TABLE contract_history ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contract_history' AND policyname = 'Organizations can view their own contract history'
  ) THEN
    CREATE POLICY "Organizations can view their own contract history"
      ON contract_history FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

COMMENT ON TABLE contract_history IS '契約履歴テーブル - 契約変更の履歴を記録';

-- ===================================
-- 4. スーパーアドミン管理テーブル
-- ===================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,

  -- 権限レベル
  permission_level TEXT NOT NULL CHECK (permission_level IN ('viewer', 'operator', 'admin')),

  -- アクセス制御
  allowed_actions TEXT[] DEFAULT ARRAY[]::TEXT[],
  ip_whitelist TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- セキュリティ
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  last_login_at TIMESTAMPTZ,
  last_login_ip TEXT,
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,

  -- ステータス
  is_active BOOLEAN DEFAULT true,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);
CREATE INDEX IF NOT EXISTS idx_super_admins_is_active ON super_admins(is_active);

-- RLS無効（スーパーアドミン専用テーブル）
-- 通常のユーザーからはアクセス不可

COMMENT ON TABLE super_admins IS 'スーパーアドミン管理テーブル - システム管理者の情報';

-- ===================================
-- 5. スーパーアドミン操作ログ
-- ===================================
CREATE TABLE IF NOT EXISTS super_admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id UUID NOT NULL REFERENCES super_admins(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT, -- 'organization', 'contract', 'user', etc.
  target_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  performed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_super_admin_id ON super_admin_logs(super_admin_id);
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_performed_at ON super_admin_logs(performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_action ON super_admin_logs(action);
CREATE INDEX IF NOT EXISTS idx_super_admin_logs_target ON super_admin_logs(target_type, target_id);

COMMENT ON TABLE super_admin_logs IS 'スーパーアドミン操作ログ - 全ての管理操作を記録';

-- ===================================
-- 6. ビュー: 組織の有効な機能一覧
-- ===================================
CREATE OR REPLACE VIEW organization_features AS
SELECT
  o.id as organization_id,
  o.name as organization_name,
  c.plan_type,
  c.user_limit,
  c.has_asset_package,
  c.has_dx_efficiency_package,
  c.status as contract_status,

  -- 利用可能な機能を計算
  CASE
    WHEN c.has_asset_package AND c.has_dx_efficiency_package THEN 'full'
    WHEN c.has_asset_package THEN 'asset'
    WHEN c.has_dx_efficiency_package THEN 'dx'
    ELSE 'none'
  END as package_type,

  -- 個別機能フラグ
  ARRAY(
    SELECT feature_key
    FROM feature_flags f
    WHERE f.organization_id = o.id
    AND f.is_enabled = true
    AND (f.enabled_until IS NULL OR f.enabled_until >= CURRENT_DATE)
  ) as enabled_features,

  c.contract_start_date,
  c.contract_end_date,
  c.trial_end_date

FROM organizations o
LEFT JOIN contracts c ON o.id = c.organization_id AND c.status = 'active'
WHERE o.deleted_at IS NULL;

COMMENT ON VIEW organization_features IS '組織の有効な機能一覧ビュー';

-- ===================================
-- 7. トリガー関数: updated_at自動更新
-- ===================================
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_feature_flags_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_feature_flags_updated_at
      BEFORE UPDATE ON feature_flags
      FOR EACH ROW
      EXECUTE FUNCTION update_feature_flags_updated_at();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION update_super_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_update_super_admins_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_super_admins_updated_at
      BEFORE UPDATE ON super_admins
      FOR EACH ROW
      EXECUTE FUNCTION update_super_admins_updated_at();
  END IF;
END $$;
