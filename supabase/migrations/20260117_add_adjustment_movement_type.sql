-- 道具登録時の在庫調整履歴用に 'adjustment' タイプを追加

ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_movement_type_check;

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_movement_type_check
  CHECK (movement_type IN (
    'check_out', 
    'check_in', 
    'transfer', 
    'repair', 
    'return_from_repair', 
    'warehouse_move', 
    'correction', 
    'lost', 
    'disposed', 
    'maintenance',
    'adjustment'
  ));
