-- 仕入先マスタを取引先マスタに統合するマイグレーション
-- 2025-12-17

-- Step 1: purchase_ordersテーブルにclient_idカラムを追加
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);

-- Step 2: purchase_ordersテーブルに差戻し関連カラムを追加
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id);
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Step 3: internal_notesをinternal_memoにリネーム（既存データがあれば保持）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'internal_notes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'internal_memo'
  ) THEN
    ALTER TABLE purchase_orders RENAME COLUMN internal_notes TO internal_memo;
  END IF;
END $$;

-- Step 4: suppliersテーブルのデータをclientsテーブルにマイグレーション
INSERT INTO clients (
  organization_id,
  client_code,
  name,
  name_kana,
  client_type,
  postal_code,
  address,
  phone,
  fax,
  email,
  contact_person,
  payment_terms,
  bank_name,
  bank_branch,
  bank_account_type,
  bank_account_number,
  bank_account_holder,
  notes,
  is_active,
  created_at,
  updated_at
)
SELECT
  s.organization_id,
  s.supplier_code,
  s.name,
  s.name_kana,
  'supplier' AS client_type, -- 仕入先として登録
  s.postal_code,
  s.address,
  s.phone,
  s.fax,
  s.email,
  s.contact_person,
  s.payment_terms,
  s.bank_name,
  s.branch_name AS bank_branch,
  s.account_type AS bank_account_type,
  s.account_number AS bank_account_number,
  s.account_holder AS bank_account_holder,
  s.notes,
  s.is_active,
  s.created_at,
  s.updated_at
FROM suppliers s
WHERE NOT EXISTS (
  -- 同じ組織で同じコードのclientが既に存在しないか確認
  SELECT 1 FROM clients c
  WHERE c.organization_id = s.organization_id
  AND c.client_code = s.supplier_code
);

-- Step 5: purchase_orders.client_idにsupplier_idのデータをコピー
-- まず、suppliersとclientsの対応関係を確立
UPDATE purchase_orders po
SET client_id = c.id
FROM suppliers s
JOIN clients c ON c.organization_id = s.organization_id AND c.client_code = s.supplier_code
WHERE po.supplier_id = s.id
AND po.client_id IS NULL;

-- Step 6: supplier_id外部キー制約を削除
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey;
ALTER TABLE purchase_orders DROP CONSTRAINT IF EXISTS purchase_orders_supplier_id_fkey2;

-- Step 7: client_idをNOT NULLに変更（全てのデータがマイグレーション済みの場合）
-- 注意: データが残っている場合はエラーになるので、先に確認が必要
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM purchase_orders WHERE client_id IS NULL
  ) THEN
    ALTER TABLE purchase_orders ALTER COLUMN client_id SET NOT NULL;
  ELSE
    RAISE NOTICE 'Warning: Some purchase_orders still have NULL client_id. Manual intervention required.';
  END IF;
END $$;

-- Step 8: supplier_idカラムを削除
ALTER TABLE purchase_orders DROP COLUMN IF EXISTS supplier_id;

-- Step 9: インデックスを再作成
CREATE INDEX IF NOT EXISTS idx_purchase_orders_client_id ON purchase_orders(client_id);
DROP INDEX IF EXISTS idx_purchase_orders_supplier_id;

-- Step 10: suppliersテーブルを削除
DROP TABLE IF EXISTS suppliers CASCADE;

-- コメント追加
COMMENT ON COLUMN purchase_orders.client_id IS '取引先ID（仕入先）- clientsテーブルのclient_type IN (''supplier'', ''both'')';
COMMENT ON COLUMN purchase_orders.rejected_by IS '差戻したユーザーID';
COMMENT ON COLUMN purchase_orders.rejected_at IS '差戻日時';
COMMENT ON COLUMN purchase_orders.rejection_reason IS '差戻理由';
COMMENT ON COLUMN purchase_orders.internal_memo IS '社内メモ';
