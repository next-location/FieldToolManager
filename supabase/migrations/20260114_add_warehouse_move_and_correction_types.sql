-- Add 'warehouse_move' and 'correction' to movement_type check constraint

-- Drop the existing constraint
ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_movement_type_check;

-- Add the new constraint with additional types
ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_movement_type_check
  CHECK (movement_type IN ('check_out', 'check_in', 'transfer', 'repair', 'return_from_repair', 'warehouse_move', 'correction', 'lost', 'disposed', 'maintenance'));

-- Update comment
COMMENT ON COLUMN tool_movements.movement_type IS '移動タイプ: check_out(持ち出し)/check_in(返却)/transfer(移動)/repair(修理)/return_from_repair(修理完了)/warehouse_move(倉庫内移動)/correction(位置修正)/lost(紛失)/disposed(廃棄)/maintenance(メンテナンス)';
