-- Add warehouse location columns to tool_movements table
-- This allows tracking detailed warehouse locations in movement history

ALTER TABLE tool_movements
ADD COLUMN from_warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
ADD COLUMN to_warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_tool_movements_from_warehouse_location
ON tool_movements(from_warehouse_location_id)
WHERE from_warehouse_location_id IS NOT NULL;

CREATE INDEX idx_tool_movements_to_warehouse_location
ON tool_movements(to_warehouse_location_id)
WHERE to_warehouse_location_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN tool_movements.from_warehouse_location_id IS '移動元の倉庫位置ID（from_location=warehouse時のみ有効）';
COMMENT ON COLUMN tool_movements.to_warehouse_location_id IS '移動先の倉庫位置ID（to_location=warehouse時のみ有効）';
