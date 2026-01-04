-- organization_settings テーブル作成
-- 実行日: 2025-01-04

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 在庫管理設定
  enable_low_stock_alert BOOLEAN DEFAULT true,
  default_minimum_stock_level INTEGER DEFAULT 5,

  -- QRコード印刷設定
  qr_print_size INTEGER DEFAULT 25,

  -- 承認フロー設定
  require_checkout_approval BOOLEAN DEFAULT false,
  require_return_approval BOOLEAN DEFAULT false,

  -- 通知設定
  enable_email_notifications BOOLEAN DEFAULT true,
  notification_email TEXT,

  -- UI設定
  theme VARCHAR(20) DEFAULT 'light',

  -- その他の設定（JSON形式で柔軟に拡張可能）
  custom_settings JSONB DEFAULT '{}'::jsonb,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 一組織一設定（UNIQUE制約）
  CONSTRAINT organization_settings_org_id_unique UNIQUE (organization_id)
);

-- RLSポリシー
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- 自組織の設定のみ参照可能
CREATE POLICY "Users can view their own organization settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- 管理者のみ設定を作成可能
CREATE POLICY "Admins can insert their organization settings"
  ON organization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 管理者のみ設定を更新可能
CREATE POLICY "Admins can update their organization settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- インデックス
CREATE INDEX IF NOT EXISTS idx_organization_settings_org_id ON organization_settings(organization_id);

-- コメント
COMMENT ON TABLE organization_settings IS '組織ごとの運用設定';
COMMENT ON COLUMN organization_settings.enable_low_stock_alert IS '低在庫アラート有効/無効';
COMMENT ON COLUMN organization_settings.qr_print_size IS 'QRコード印刷サイズ（mm）';
COMMENT ON COLUMN organization_settings.custom_settings IS 'その他カスタム設定（JSONB）';
