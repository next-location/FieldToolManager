-- 道具メーカーマスタテーブルの作成
-- メーカー名の表記ゆれを防ぎ、データの一貫性を保つ

-- Step 1: tool_manufacturersテーブルを作成
CREATE TABLE tool_manufacturers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  is_system_common BOOLEAN DEFAULT false NOT NULL,
  name TEXT NOT NULL,
  country TEXT, -- 国（例: 日本、ドイツ、アメリカ）
  website_url TEXT,
  support_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ,

  -- 制約: 共通メーカーはorganization_id = NULL、組織メーカーはNOT NULL
  CONSTRAINT tool_manufacturers_system_common_check
  CHECK (
    (is_system_common = false AND organization_id IS NOT NULL) OR
    (is_system_common = true AND organization_id IS NULL)
  ),

  -- ユニーク制約: 同じ組織内で同じメーカー名は不可（削除されていない場合のみ）
  CONSTRAINT tool_manufacturers_org_name_unique
  UNIQUE NULLS NOT DISTINCT (organization_id, name, deleted_at)
);

-- Step 2: インデックス作成
CREATE INDEX idx_tool_manufacturers_system_common
ON tool_manufacturers(is_system_common)
WHERE deleted_at IS NULL;

CREATE INDEX idx_tool_manufacturers_org_id
ON tool_manufacturers(organization_id)
WHERE deleted_at IS NULL;

CREATE INDEX idx_tool_manufacturers_name
ON tool_manufacturers(name)
WHERE deleted_at IS NULL;

-- Step 3: RLSポリシー設定
ALTER TABLE tool_manufacturers ENABLE ROW LEVEL SECURITY;

-- 閲覧ポリシー: 自組織のメーカー + システム共通メーカー
CREATE POLICY "Users can view tool_manufacturers" ON tool_manufacturers
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    (is_system_common = false AND organization_id = get_organization_id()) OR
    (is_system_common = true AND organization_id IS NULL)
  )
);

-- 挿入ポリシー: 自組織のメーカーのみ
CREATE POLICY "Users can insert own organization tool_manufacturers" ON tool_manufacturers
FOR INSERT
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- 更新ポリシー: 自組織のメーカーのみ
CREATE POLICY "Users can update own organization tool_manufacturers" ON tool_manufacturers
FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
)
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- 削除ポリシー: 自組織のメーカーのみ（論理削除）
CREATE POLICY "Users can delete own organization tool_manufacturers" ON tool_manufacturers
FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
);

-- Step 4: システム共通メーカーの初期データ挿入
-- 建設・塗装業界の主要メーカー
INSERT INTO tool_manufacturers (organization_id, is_system_common, name, country) VALUES
  -- 日本メーカー（電動工具）
  (NULL, true, 'マキタ', '日本'),
  (NULL, true, 'HiKOKI（旧日立工機）', '日本'),
  (NULL, true, 'MAX', '日本'),
  (NULL, true, 'リョービ', '日本'),
  (NULL, true, 'パナソニック', '日本'),

  -- 海外メーカー（電動工具）
  (NULL, true, 'BOSCH', 'ドイツ'),
  (NULL, true, 'DeWALT', 'アメリカ'),
  (NULL, true, 'ミルウォーキー', 'アメリカ'),

  -- 手工具・測定機器
  (NULL, true, 'タジマ', '日本'),
  (NULL, true, 'TRUSCO', '日本'),
  (NULL, true, 'SK11', '日本'),
  (NULL, true, 'ベッセル', '日本'),
  (NULL, true, 'KTC', '日本'),
  (NULL, true, 'ムラテックKDS', '日本'),

  -- 塗装機器
  (NULL, true, 'アネスト岩田', '日本'),
  (NULL, true, 'アサヒペン', '日本'),
  (NULL, true, 'ワグナー', 'ドイツ'),

  -- 安全用具
  (NULL, true, 'ミドリ安全', '日本'),
  (NULL, true, 'トーヨーセフティー', '日本'),
  (NULL, true, 'タニザワ', '日本'),

  -- 建設機械・重機
  (NULL, true, 'コマツ', '日本'),
  (NULL, true, 'ヤンマー', '日本'),
  (NULL, true, 'クボタ', '日本'),
  (NULL, true, 'キャタピラー', 'アメリカ'),

  -- その他・汎用
  (NULL, true, 'その他', NULL)
ON CONFLICT DO NOTHING;

-- Step 5: toolsテーブルにmanufacturer_idカラムを追加
-- 既存のmanufacturerカラムは残しつつ、manufacturer_idを追加
ALTER TABLE tools ADD COLUMN manufacturer_id UUID REFERENCES tool_manufacturers(id);

-- Step 6: インデックス追加
CREATE INDEX idx_tools_manufacturer_id ON tools(manufacturer_id) WHERE deleted_at IS NULL;

-- Step 7: コメント追加
COMMENT ON TABLE tool_manufacturers IS '道具メーカーマスタ。システム共通メーカーと組織独自メーカーを管理';
COMMENT ON COLUMN tool_manufacturers.is_system_common IS 'システム共通メーカーフラグ。trueの場合は全組織で参照可能';
COMMENT ON COLUMN tools.manufacturer IS '旧メーカー名（テキスト）。非推奨。manufacturer_idを使用推奨';
COMMENT ON COLUMN tools.manufacturer_id IS 'メーカーマスタへの参照。manufacturer_idがある場合はこちらを優先';
