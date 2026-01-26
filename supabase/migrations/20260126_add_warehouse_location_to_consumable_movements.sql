-- 消耗品移動履歴に倉庫位置情報を追加
-- consumable_movementsテーブルに倉庫位置IDカラムを追加

ALTER TABLE consumable_movements
ADD COLUMN IF NOT EXISTS from_warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS to_warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_consumable_movements_from_warehouse_location
ON consumable_movements(from_warehouse_location_id)
WHERE from_warehouse_location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_consumable_movements_to_warehouse_location
ON consumable_movements(to_warehouse_location_id)
WHERE to_warehouse_location_id IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN consumable_movements.from_warehouse_location_id IS '移動元の倉庫位置ID（from_location_type=warehouse時のみ有効）';
COMMENT ON COLUMN consumable_movements.to_warehouse_location_id IS '移動先の倉庫位置ID（to_location_type=warehouse時のみ有効）';
