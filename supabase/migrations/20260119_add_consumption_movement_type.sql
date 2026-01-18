-- Add '消費' to consumable_movements movement_type CHECK constraint

-- Drop existing constraint
ALTER TABLE consumable_movements
  DROP CONSTRAINT IF EXISTS consumable_movements_movement_type_check;

-- Add new constraint with '消費' included
ALTER TABLE consumable_movements
  ADD CONSTRAINT consumable_movements_movement_type_check
  CHECK (movement_type IN ('入庫', '出庫', '移動', '調整', '棚卸', '一括移動', '消費'));

COMMENT ON CONSTRAINT consumable_movements_movement_type_check ON consumable_movements IS '移動タイプ制約: 入庫/出庫/移動/調整/棚卸/一括移動/消費';
