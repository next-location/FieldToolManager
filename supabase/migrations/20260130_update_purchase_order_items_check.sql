-- 発注明細の品目タイプに'equipment'を追加
-- equipment (機材) を許可するようにチェック制約を更新

-- 既存の制約を削除
ALTER TABLE purchase_order_items
DROP CONSTRAINT IF EXISTS purchase_order_items_item_type_check;

-- 新しい制約を追加（equipmentを含む）
ALTER TABLE purchase_order_items
ADD CONSTRAINT purchase_order_items_item_type_check
CHECK (item_type IN ('material', 'labor', 'subcontract', 'equipment', 'expense', 'other'));
