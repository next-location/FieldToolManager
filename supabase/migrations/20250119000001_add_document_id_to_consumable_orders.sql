-- 消耗品発注に発注書（documents）との紐付けカラムを追加
-- 実装日: 2026-01-19
-- 目的: 消耗品発注管理とフル機能パックの帳票管理（発注書PDF）を連携

-- document_id カラムを追加
ALTER TABLE consumable_orders
ADD COLUMN document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- インデックス追加（発注書からの逆引き検索を高速化）
CREATE INDEX idx_consumable_orders_document_id
ON consumable_orders(document_id)
WHERE document_id IS NOT NULL;

-- コメント追加
COMMENT ON COLUMN consumable_orders.document_id IS '生成された発注書のドキュメントID（documentsテーブルへの参照）';
