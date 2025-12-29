-- 請求書テーブルに初回請求フラグを追加
-- 初回請求書（初期費用含む）と2回目以降の請求書（月額のみ）を区別するため

-- カラム追加
ALTER TABLE invoices
ADD COLUMN is_initial_invoice BOOLEAN DEFAULT false;

-- 既存の請求書はすべて初回請求書でないと仮定
UPDATE invoices SET is_initial_invoice = false WHERE is_initial_invoice IS NULL;

-- インデックス追加（初回請求書の検索を高速化）
CREATE INDEX idx_invoices_contract_initial
ON invoices(contract_id, is_initial_invoice)
WHERE is_initial_invoice = true;

-- コメント追加
COMMENT ON COLUMN invoices.is_initial_invoice IS '初回請求書フラグ（true: 初回請求書（初期費用含む）, false: 2回目以降（月額のみ））';
