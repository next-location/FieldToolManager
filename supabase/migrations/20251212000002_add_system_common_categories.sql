-- システム共通カテゴリサポート追加
-- tool_categoriesテーブルにis_system_commonカラムを追加し、共通カテゴリを管理可能にする

-- Step 1: is_system_commonカラムを追加
ALTER TABLE tool_categories
ADD COLUMN is_system_common BOOLEAN DEFAULT false NOT NULL;

-- Step 2: organization_idをNULL許可に変更
ALTER TABLE tool_categories
ALTER COLUMN organization_id DROP NOT NULL;

-- Step 3: 制約を追加（共通カテゴリはorganization_id = NULL、組織カテゴリはNOT NULL）
ALTER TABLE tool_categories
ADD CONSTRAINT tool_categories_system_common_check
CHECK (
  (is_system_common = false AND organization_id IS NOT NULL) OR
  (is_system_common = true AND organization_id IS NULL)
);

-- Step 4: RLSポリシーを更新
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can view own organization tool_categories" ON tool_categories;
DROP POLICY IF EXISTS "Users can insert own organization tool_categories" ON tool_categories;
DROP POLICY IF EXISTS "Users can update own organization tool_categories" ON tool_categories;
DROP POLICY IF EXISTS "Users can delete own organization tool_categories" ON tool_categories;

-- 新しいポリシー: 閲覧（自組織 + 共通カテゴリ）
CREATE POLICY "Users can view tool_categories" ON tool_categories
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    (is_system_common = false AND organization_id = get_organization_id()) OR
    (is_system_common = true AND organization_id IS NULL)
  )
);

-- 新しいポリシー: 挿入（自組織のみ）
CREATE POLICY "Users can insert own organization tool_categories" ON tool_categories
FOR INSERT
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- 新しいポリシー: 更新（自組織のみ）
CREATE POLICY "Users can update own organization tool_categories" ON tool_categories
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

-- 新しいポリシー: 削除（自組織のみ）
CREATE POLICY "Users can delete own organization tool_categories" ON tool_categories
FOR DELETE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
);

-- Step 5: インデックスを追加
CREATE INDEX IF NOT EXISTS idx_tool_categories_system_common
ON tool_categories(is_system_common)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tool_categories_org_common
ON tool_categories(organization_id, is_system_common)
WHERE deleted_at IS NULL;

-- Step 6: システム共通カテゴリの初期データを挿入
INSERT INTO tool_categories (organization_id, is_system_common, name) VALUES
  (NULL, true, '電動工具'),
  (NULL, true, '手工具'),
  (NULL, true, '測定機器'),
  (NULL, true, '安全用具'),
  (NULL, true, '建設機械'),
  (NULL, true, '塗装機器'),
  (NULL, true, '足場用具'),
  (NULL, true, '運搬用具'),
  (NULL, true, 'その他')
ON CONFLICT DO NOTHING;

-- コメント追加
COMMENT ON COLUMN tool_categories.is_system_common IS 'システム共通カテゴリフラグ。trueの場合はorganization_id = NULLで全組織で参照可能';
