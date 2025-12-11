-- 契約テーブルに初期費用割引カラムを追加
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS initial_discount NUMERIC(10, 2) DEFAULT 0;

-- カラムのコメント追加
COMMENT ON COLUMN contracts.initial_discount IS '初期費用の割引額（キャンペーンや特別割引）';
