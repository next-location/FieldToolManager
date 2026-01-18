-- sitesテーブルにtypeカラムを追加
-- Phase 1: Database Preparation for Multi-Location Management

-- Step 1: Add type column with default value for existing data
ALTER TABLE sites
ADD COLUMN type TEXT NOT NULL DEFAULT 'customer_site'
CHECK (type IN ('customer_site', 'own_warehouse', 'branch', 'storage_yard', 'other'));

-- Step 2: Add is_own_location generated column for easy filtering
ALTER TABLE sites
ADD COLUMN is_own_location BOOLEAN GENERATED ALWAYS AS (
  type IN ('own_warehouse', 'branch', 'storage_yard')
) STORED;

-- Step 3: Create index for performance
CREATE INDEX idx_sites_type ON sites(type);
CREATE INDEX idx_sites_is_own_location ON sites(is_own_location) WHERE is_own_location = true;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN sites.type IS '拠点タイプ: customer_site=顧客現場, own_warehouse=自社倉庫, branch=支店, storage_yard=資材置き場, other=その他';
COMMENT ON COLUMN sites.is_own_location IS '自社拠点かどうか (type が own_warehouse, branch, storage_yard の場合 true)';
