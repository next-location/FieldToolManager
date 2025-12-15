-- billing_invoice_items の item_type 制約を修正
-- 見積もりから請求書作成時に 'construction' タイプをサポート

ALTER TABLE billing_invoice_items
DROP CONSTRAINT IF EXISTS billing_invoice_items_item_type_check;

ALTER TABLE billing_invoice_items
ADD CONSTRAINT billing_invoice_items_item_type_check
CHECK (item_type IN ('construction', 'material', 'labor', 'subcontract', 'expense', 'other'));
