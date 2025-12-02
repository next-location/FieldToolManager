-- 業種マスタテーブル（大分類・中分類）
CREATE TABLE industry_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES industry_categories(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  name_en VARCHAR(100),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_industry_categories_parent ON industry_categories(parent_id);
CREATE INDEX idx_industry_categories_sort ON industry_categories(sort_order);

-- 組織設定テーブル
CREATE TABLE organization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 在庫管理設定
  enable_low_stock_alert BOOLEAN DEFAULT true,
  default_minimum_stock_level INTEGER DEFAULT 5,

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

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- インデックス
CREATE INDEX idx_organization_settings_org ON organization_settings(organization_id);

-- organizations テーブルに追加カラム
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS representative_name VARCHAR(100);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS postal_code VARCHAR(10);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS industry_category_id UUID REFERENCES industry_categories(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS setup_completed_at TIMESTAMPTZ;

-- インデックス
CREATE INDEX IF NOT EXISTS idx_organizations_industry ON organizations(industry_category_id);
CREATE INDEX IF NOT EXISTS idx_organizations_setup ON organizations(setup_completed_at);

-- 業種マスタの初期データ投入

-- 大分類
INSERT INTO industry_categories (id, parent_id, name, name_en, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', NULL, '土木・基礎', 'Civil Engineering & Foundation', 1),
  ('22222222-2222-2222-2222-222222222222', NULL, '建築・構造', 'Architecture & Structure', 2),
  ('33333333-3333-3333-3333-333333333333', NULL, '内装・仕上', 'Interior & Finishing', 3),
  ('44444444-4444-4444-4444-444444444444', NULL, '設備・インフラ', 'Facility & Infrastructure', 4);

-- 土木・基礎 (7業種)
INSERT INTO industry_categories (parent_id, name, name_en, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', '土工事', 'Earthwork', 1),
  ('11111111-1111-1111-1111-111111111111', '基礎工事', 'Foundation Work', 2),
  ('11111111-1111-1111-1111-111111111111', '杭工事', 'Pile Work', 3),
  ('11111111-1111-1111-1111-111111111111', '鉄筋工事', 'Reinforcing Bar Work', 4),
  ('11111111-1111-1111-1111-111111111111', 'コンクリート工事', 'Concrete Work', 5),
  ('11111111-1111-1111-1111-111111111111', '舗装工事', 'Paving Work', 6),
  ('11111111-1111-1111-1111-111111111111', '解体工事', 'Demolition Work', 7);

-- 建築・構造 (5業種)
INSERT INTO industry_categories (parent_id, name, name_en, sort_order) VALUES
  ('22222222-2222-2222-2222-222222222222', '大工工事', 'Carpentry Work', 1),
  ('22222222-2222-2222-2222-222222222222', '鉄骨工事', 'Steel Frame Work', 2),
  ('22222222-2222-2222-2222-222222222222', '屋根工事', 'Roofing Work', 3),
  ('22222222-2222-2222-2222-222222222222', '板金工事', 'Sheet Metal Work', 4),
  ('22222222-2222-2222-2222-222222222222', '防水工事', 'Waterproofing Work', 5);

-- 内装・仕上 (5業種)
INSERT INTO industry_categories (parent_id, name, name_en, sort_order) VALUES
  ('33333333-3333-3333-3333-333333333333', '左官工事', 'Plastering Work', 1),
  ('33333333-3333-3333-3333-333333333333', '塗装工事', 'Painting Work', 2),
  ('33333333-3333-3333-3333-333333333333', '内装仕上工事', 'Interior Finishing Work', 3),
  ('33333333-3333-3333-3333-333333333333', 'タイル工事', 'Tile Work', 4),
  ('33333333-3333-3333-3333-333333333333', 'ガラス工事', 'Glass Work', 5);

-- 設備・インフラ (5業種)
INSERT INTO industry_categories (parent_id, name, name_en, sort_order) VALUES
  ('44444444-4444-4444-4444-444444444444', '電気工事', 'Electrical Work', 1),
  ('44444444-4444-4444-4444-444444444444', '管工事（配管）', 'Plumbing Work', 2),
  ('44444444-4444-4444-4444-444444444444', '空調設備工事', 'HVAC Work', 3),
  ('44444444-4444-4444-4444-444444444444', '通信設備工事', 'Communication Facilities Work', 4),
  ('44444444-4444-4444-4444-444444444444', '造園工事', 'Landscaping Work', 5);

-- RLS ポリシー

-- industry_categories は全組織が参照可能（読み取り専用）
ALTER TABLE industry_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Industry categories are viewable by all authenticated users"
  ON industry_categories FOR SELECT
  TO authenticated
  USING (true);

-- organization_settings は自組織のみアクセス可能
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own organization settings"
  ON organization_settings FOR SELECT
  TO authenticated
  USING (organization_id = get_organization_id());

CREATE POLICY "Admins can insert their organization settings"
  ON organization_settings FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = get_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = get_organization_id()
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can update their organization settings"
  ON organization_settings FOR UPDATE
  TO authenticated
  USING (
    organization_id = get_organization_id() AND
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = get_organization_id()
      AND users.role = 'admin'
    )
  )
  WITH CHECK (organization_id = get_organization_id());

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();

CREATE TRIGGER trigger_update_industry_categories_updated_at
  BEFORE UPDATE ON industry_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();
