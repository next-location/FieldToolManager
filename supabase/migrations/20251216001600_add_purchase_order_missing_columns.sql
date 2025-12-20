-- purchase_ordersテーブルに不足しているカラムを追加
DO $$
BEGIN
  -- payment_termsカラムを追加（存在しない場合のみ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'payment_terms'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN payment_terms VARCHAR(100);
  END IF;

  -- ordered_atカラムを追加（存在しない場合のみ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'ordered_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN ordered_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- delivered_atカラムを追加（存在しない場合のみ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN delivered_at TIMESTAMP WITH TIME ZONE;
  END IF;

  -- paid_atカラムを追加（存在しない場合のみ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_orders' AND column_name = 'paid_at'
  ) THEN
    ALTER TABLE purchase_orders ADD COLUMN paid_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- purchase_ordersのstatusチェック制約を更新（より詳細なステータス管理）
DO $$
BEGIN
  -- 既存の制約を削除
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'purchase_orders' AND constraint_name = 'purchase_orders_status_check'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_status_check;
  END IF;

  -- 新しい制約を追加
  ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_status_check
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'ordered', 'partially_received', 'received', 'paid', 'cancelled'));
END $$;

-- purchase_order_historyテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS purchase_order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  comment TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- purchase_order_historyのインデックス作成
CREATE INDEX IF NOT EXISTS idx_purchase_order_history_purchase_order_id
  ON purchase_order_history(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_history_created_at
  ON purchase_order_history(created_at);

-- purchase_order_history RLS有効化
ALTER TABLE purchase_order_history ENABLE ROW LEVEL SECURITY;

-- purchase_order_history RLSポリシー（存在しない場合のみ作成）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'purchase_order_history'
    AND policyname = 'Users can view purchase order history'
  ) THEN
    CREATE POLICY "Users can view purchase order history"
      ON purchase_order_history FOR SELECT
      USING (
        purchase_order_id IN (
          SELECT id FROM purchase_orders WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'purchase_order_history'
    AND policyname = 'Users can insert purchase order history'
  ) THEN
    CREATE POLICY "Users can insert purchase order history"
      ON purchase_order_history FOR INSERT
      WITH CHECK (
        purchase_order_id IN (
          SELECT id FROM purchase_orders WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        ) AND created_by = auth.uid()
      );
  END IF;
END $$;

-- supplier_idの外部キー制約を修正（clientsではなくsuppliersを参照）
DO $$
BEGIN
  -- 既存の制約を削除
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'purchase_orders'
    AND constraint_name = 'purchase_orders_supplier_id_fkey'
  ) THEN
    ALTER TABLE purchase_orders DROP CONSTRAINT purchase_orders_supplier_id_fkey;
  END IF;

  -- 新しい制約を追加
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'purchase_orders'
    AND constraint_name = 'purchase_orders_supplier_id_fkey2'
  ) THEN
    ALTER TABLE purchase_orders ADD CONSTRAINT purchase_orders_supplier_id_fkey2
      FOREIGN KEY (supplier_id) REFERENCES suppliers(id);
  END IF;
END $$;

-- コメント追加
COMMENT ON TABLE suppliers IS '仕入先マスタ';
COMMENT ON TABLE purchase_orders IS '発注書';
COMMENT ON TABLE purchase_order_items IS '発注明細';
COMMENT ON TABLE purchase_order_history IS '発注書履歴';
