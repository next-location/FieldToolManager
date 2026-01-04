-- 消耗品発注ステータスを「発注中」→「下書き中」に変更
-- 実行日: 2025-01-04

-- 既存データの更新
UPDATE consumable_orders
SET status = '下書き中'
WHERE status = '発注中';

-- CHECK制約を削除
ALTER TABLE consumable_orders
DROP CONSTRAINT IF EXISTS consumable_orders_status_check;

-- 新しいCHECK制約を追加
ALTER TABLE consumable_orders
ADD CONSTRAINT consumable_orders_status_check
CHECK (status IN ('下書き中', '発注済み', '納品済み', 'キャンセル'));

-- コメント更新
COMMENT ON COLUMN consumable_orders.status IS '発注ステータス: 下書き中/発注済み/納品済み/キャンセル';
