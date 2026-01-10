-- ============================================================
-- シリアル番号の重複防止: UNIQUE制約追加
-- ============================================================

-- tool_items テーブルに複合UNIQUE制約を追加
-- 同じtool_id内でserial_numberの重複を防ぐ
ALTER TABLE tool_items
ADD CONSTRAINT tool_items_tool_id_serial_number_unique
UNIQUE (tool_id, serial_number);

-- インデックスも追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_tool_items_tool_serial
ON tool_items(tool_id, serial_number)
WHERE deleted_at IS NULL;
