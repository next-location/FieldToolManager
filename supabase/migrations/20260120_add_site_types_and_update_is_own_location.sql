-- 拠点タイプに重機置き場と駐車場を追加し、is_own_locationの定義を更新
-- すべての自社拠点タイプ（customer_site以外）を is_own_location=true にする

-- Step 1: type列の制約を削除
ALTER TABLE sites DROP CONSTRAINT IF EXISTS sites_type_check;

-- Step 2: 新しい制約を追加（equipment_yard, parking を追加）
ALTER TABLE sites ADD CONSTRAINT sites_type_check
CHECK (type IN ('customer_site', 'own_warehouse', 'branch', 'storage_yard', 'equipment_yard', 'parking', 'other'));

-- Step 3: is_own_location生成列を削除
ALTER TABLE sites DROP COLUMN IF EXISTS is_own_location;

-- Step 4: 新しいis_own_location生成列を追加（customer_site以外は全てtrue）
ALTER TABLE sites
ADD COLUMN is_own_location BOOLEAN GENERATED ALWAYS AS (
  type != 'customer_site'
) STORED;

-- Step 5: インデックスを再作成
DROP INDEX IF EXISTS idx_sites_is_own_location;
CREATE INDEX idx_sites_is_own_location ON sites(is_own_location) WHERE is_own_location = true;

-- Step 6: コメントを更新
COMMENT ON COLUMN sites.type IS '拠点タイプ: customer_site=顧客現場, own_warehouse=自社倉庫, branch=支店, storage_yard=資材置き場, equipment_yard=重機置き場, parking=駐車場, other=その他';
COMMENT ON COLUMN sites.is_own_location IS '自社拠点かどうか (type が customer_site 以外の場合 true)';
