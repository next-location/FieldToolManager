-- 発注書設定テーブル作成
CREATE TABLE IF NOT EXISTS purchase_order_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 承認金額閾値設定
  approval_threshold_level1 NUMERIC(15, 2) DEFAULT 100000, -- 10万円（leader以上）
  approval_threshold_level2 NUMERIC(15, 2) DEFAULT 1000000, -- 100万円（admin必須）

  -- その他設定
  require_project BOOLEAN DEFAULT false, -- 工事の紐づけを必須にするか
  auto_numbering_prefix TEXT DEFAULT 'PO', -- 発注番号プレフィックス

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 組織ごとに1レコードのみ
  CONSTRAINT unique_org_settings UNIQUE (organization_id)
);

-- RLS有効化
ALTER TABLE purchase_order_settings ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自組織のみアクセス可能
CREATE POLICY "Users can view their organization settings"
  ON purchase_order_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization settings"
  ON purchase_order_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert their organization settings"
  ON purchase_order_settings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- インデックス作成
CREATE INDEX idx_purchase_order_settings_org ON purchase_order_settings(organization_id);

-- コメント追加
COMMENT ON TABLE purchase_order_settings IS '発注書システムの組織別設定';
COMMENT ON COLUMN purchase_order_settings.approval_threshold_level1 IS 'レベル1承認金額閾値（leader以上が承認可能）';
COMMENT ON COLUMN purchase_order_settings.approval_threshold_level2 IS 'レベル2承認金額閾値（admin必須）';
