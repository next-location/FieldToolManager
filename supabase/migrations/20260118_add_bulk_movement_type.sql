-- Add '一括移動' to consumable_movements movement_type CHECK constraint

-- Drop existing constraint
ALTER TABLE consumable_movements
  DROP CONSTRAINT IF EXISTS consumable_movements_movement_type_check;

-- Add new constraint with '一括移動' included
ALTER TABLE consumable_movements
  ADD CONSTRAINT consumable_movements_movement_type_check
  CHECK (movement_type IN ('入庫', '出庫', '移動', '調整', '棚卸', '一括移動'));
