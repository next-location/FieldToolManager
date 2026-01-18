-- Phase 5: 消耗品テーブルを sites ベースに改修
-- location_type (文字列) から location_id (UUID) への移行

-- ============================================
-- Step 1: consumable_movements テーブル改修
-- ============================================

-- 新しい location_id カラムを追加
ALTER TABLE consumable_movements
  ADD COLUMN from_location_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  ADD COLUMN to_location_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX idx_consumable_movements_from_location ON consumable_movements(from_location_id);
CREATE INDEX idx_consumable_movements_to_location ON consumable_movements(to_location_id);

-- コメント追加
COMMENT ON COLUMN consumable_movements.from_location_id IS '移動元の拠点ID（sitesテーブル）';
COMMENT ON COLUMN consumable_movements.to_location_id IS '移動先の拠点ID（sitesテーブル）';

-- 既存のカラムを非推奨とマーク（削除はしない - 後方互換性のため）
COMMENT ON COLUMN consumable_movements.from_location_type IS '【非推奨】移動元タイプ（from_location_id を使用してください）';
COMMENT ON COLUMN consumable_movements.to_location_type IS '【非推奨】移動先タイプ（to_location_id を使用してください）';
COMMENT ON COLUMN consumable_movements.from_site_id IS '【非推奨】移動元現場ID（from_location_id を使用してください）';
COMMENT ON COLUMN consumable_movements.to_site_id IS '【非推奨】移動先現場ID（to_location_id を使用してください）';

-- ============================================
-- Step 2: consumable_inventory テーブル改修
-- ============================================

-- 新しい location_id カラムを追加
ALTER TABLE consumable_inventory
  ADD COLUMN location_id UUID REFERENCES sites(id) ON DELETE CASCADE;

-- インデックス追加
CREATE INDEX idx_consumable_inventory_location_id ON consumable_inventory(location_id);

-- コメント追加
COMMENT ON COLUMN consumable_inventory.location_id IS '在庫場所の拠点ID（sitesテーブル）';

-- 既存のカラムを非推奨とマーク
COMMENT ON COLUMN consumable_inventory.location_type IS '【非推奨】場所タイプ（location_id を使用してください）';
COMMENT ON COLUMN consumable_inventory.site_id IS '【非推奨】現場ID（location_id を使用してください）';

-- ============================================
-- Step 3: UNIQUE制約の更新
-- ============================================

-- 古い UNIQUE制約を削除
ALTER TABLE consumable_inventory
  DROP CONSTRAINT IF EXISTS consumable_inventory_organization_id_tool_id_location_type_sit_key;

-- 新しい UNIQUE制約を追加（location_id ベース）
-- 注: 既存データとの互換性のため、まずは追加のみ
ALTER TABLE consumable_inventory
  ADD CONSTRAINT consumable_inventory_org_tool_location_unique
  UNIQUE(organization_id, tool_id, location_id, warehouse_location_id);

-- ============================================
-- ロールバックSQL（緊急時用）
-- ============================================

/*
-- consumable_movements のロールバック
ALTER TABLE consumable_movements
  DROP COLUMN IF EXISTS from_location_id,
  DROP COLUMN IF EXISTS to_location_id;

-- consumable_inventory のロールバック
ALTER TABLE consumable_inventory
  DROP CONSTRAINT IF EXISTS consumable_inventory_org_tool_location_unique;

ALTER TABLE consumable_inventory
  DROP COLUMN IF EXISTS location_id;

-- 元の UNIQUE制約を復元
ALTER TABLE consumable_inventory
  ADD CONSTRAINT consumable_inventory_organization_id_tool_id_location_type_sit_key
  UNIQUE(organization_id, tool_id, location_type, site_id, warehouse_location_id);
*/
