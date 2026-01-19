-- 消耗品発注に取引先IDを追加
ALTER TABLE consumable_orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- 既存のsupplier_name/supplier_contactは残しておく（後方互換性のため）
-- 今後は client_id を優先的に使用

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_consumable_orders_client ON consumable_orders(client_id);

-- コメント追加
COMMENT ON COLUMN consumable_orders.client_id IS '仕入れ先（取引先テーブルのID）';
