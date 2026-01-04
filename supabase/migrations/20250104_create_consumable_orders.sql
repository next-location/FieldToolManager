-- 消耗品発注管理テーブル
CREATE TABLE IF NOT EXISTS consumable_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- 発注情報
  order_number TEXT NOT NULL, -- 発注番号（企業内で一意）
  order_date DATE NOT NULL, -- 発注日
  expected_delivery_date DATE, -- 納品予定日
  actual_delivery_date DATE, -- 実際の納品日

  -- 数量・金額
  quantity INTEGER NOT NULL CHECK (quantity > 0), -- 発注数量
  unit_price DECIMAL(10, 2), -- 単価
  total_price DECIMAL(10, 2), -- 合計金額

  -- 発注先
  supplier_name TEXT, -- 仕入れ先名
  supplier_contact TEXT, -- 仕入れ先連絡先

  -- ステータス
  status TEXT NOT NULL DEFAULT '下書き中' CHECK (status IN ('下書き中', '発注済み', '納品済み', 'キャンセル')),

  -- メモ
  notes TEXT,

  -- 実行者
  ordered_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  received_by UUID REFERENCES users(id) ON DELETE SET NULL, -- 受領者

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- インデックス作成
CREATE INDEX idx_consumable_orders_org ON consumable_orders(organization_id);
CREATE INDEX idx_consumable_orders_tool ON consumable_orders(tool_id);
CREATE INDEX idx_consumable_orders_status ON consumable_orders(status);
CREATE INDEX idx_consumable_orders_order_date ON consumable_orders(order_date DESC);

-- 発注番号の組織内一意性制約
CREATE UNIQUE INDEX idx_consumable_orders_number ON consumable_orders(organization_id, order_number) WHERE deleted_at IS NULL;

-- 更新日時の自動更新トリガー
CREATE TRIGGER update_consumable_orders_updated_at
  BEFORE UPDATE ON consumable_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS（Row Level Security）有効化
ALTER TABLE consumable_orders ENABLE ROW LEVEL SECURITY;

-- ポリシー: 閲覧（組織内全ユーザー）
CREATE POLICY "Users can view consumable orders in their organization"
  ON consumable_orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ポリシー: 作成（組織内全ユーザー）
CREATE POLICY "Users can create consumable orders in their organization"
  ON consumable_orders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ポリシー: 更新（組織内のリーダー・管理者のみ）
CREATE POLICY "Leaders can update consumable orders in their organization"
  ON consumable_orders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'leader')
    )
  );

-- ポリシー: 論理削除（組織内の管理者のみ）
CREATE POLICY "Admins can delete consumable orders in their organization"
  ON consumable_orders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- コメント追加
COMMENT ON TABLE consumable_orders IS '消耗品の発注管理テーブル';
COMMENT ON COLUMN consumable_orders.order_number IS '発注番号（企業内で一意）';
COMMENT ON COLUMN consumable_orders.status IS '発注ステータス: 下書き中/発注済み/納品済み/キャンセル';
COMMENT ON COLUMN consumable_orders.ordered_by IS '発注者のユーザーID';
COMMENT ON COLUMN consumable_orders.received_by IS '受領者のユーザーID';
