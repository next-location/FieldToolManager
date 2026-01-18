-- Add warehouse transfer movement types to tool_movements
-- 自社拠点間移動をサポートするため、CHECK制約を更新

-- Step 1: 既存のCHECK制約を削除
ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_movement_type_check;

-- Step 2: 新しいCHECK制約を追加（自社拠点間移動タイプを含む）
ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_movement_type_check
  CHECK (movement_type IN (
    'check_out',           -- 現場へ持出
    'check_in',            -- 現場から返却
    'transfer',            -- 現場間移動
    'repair',              -- 修理へ
    'return_from_repair',  -- 修理から戻す
    'adjustment',          -- 在庫調整
    'correction',          -- 位置補正
    'warehouse_move',      -- 倉庫内移動・自社拠点間移動
    'lost',                -- 紛失
    'disposed',            -- 廃棄
    'maintenance'          -- メンテナンス
  ));

COMMENT ON CONSTRAINT tool_movements_movement_type_check ON tool_movements IS '移動タイプ制約: 持出/返却/移動/修理/調整/補正/拠点間移動/紛失/廃棄/メンテナンス';

-- ロールバックSQL（緊急時用）
/*
ALTER TABLE tool_movements
  DROP CONSTRAINT IF EXISTS tool_movements_movement_type_check;

ALTER TABLE tool_movements
  ADD CONSTRAINT tool_movements_movement_type_check
  CHECK (movement_type IN ('check_out', 'check_in', 'transfer', 'repair', 'return_from_repair'));
*/
