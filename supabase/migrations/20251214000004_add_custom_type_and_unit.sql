-- estimate_itemsテーブルにcustom_typeとcustom_unitカラムを追加

ALTER TABLE estimate_items
ADD COLUMN IF NOT EXISTS custom_type TEXT,
ADD COLUMN IF NOT EXISTS custom_unit TEXT;

COMMENT ON COLUMN estimate_items.custom_type IS 'item_type="other"の場合のカスタム種別';
COMMENT ON COLUMN estimate_items.custom_unit IS 'unit="other"の場合のカスタム単位';
