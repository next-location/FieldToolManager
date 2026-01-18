-- Add unit_price and total_amount columns to consumable_movements table

ALTER TABLE consumable_movements
  ADD COLUMN unit_price DECIMAL(10, 2) DEFAULT NULL,
  ADD COLUMN total_amount DECIMAL(12, 2) DEFAULT NULL;

COMMENT ON COLUMN consumable_movements.unit_price IS '単価（円）- 在庫追加時に記録';
COMMENT ON COLUMN consumable_movements.total_amount IS '合計金額（円）- quantity × unit_price';
