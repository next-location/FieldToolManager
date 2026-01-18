-- tool_itemsテーブルに購入情報カラムを追加

ALTER TABLE tool_items
  ADD COLUMN purchase_date DATE,
  ADD COLUMN purchase_price DECIMAL(12, 2);

COMMENT ON COLUMN tool_items.purchase_date IS '購入日';
COMMENT ON COLUMN tool_items.purchase_price IS '購入価格（円）';

-- インデックス追加（購入日での検索用）
CREATE INDEX idx_tool_items_purchase_date ON tool_items(purchase_date);
