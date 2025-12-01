-- 消耗品移動履歴テーブルを作成
CREATE TABLE consumable_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,

  -- 移動タイプ
  movement_type TEXT NOT NULL CHECK (movement_type IN ('入庫', '出庫', '移動', '調整', '棚卸')),

  -- 移動元・移動先
  from_location_type TEXT CHECK (from_location_type IN ('warehouse', 'site')),
  from_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  to_location_type TEXT CHECK (to_location_type IN ('warehouse', 'site')),
  to_site_id UUID REFERENCES sites(id) ON DELETE SET NULL,

  -- 数量
  quantity INTEGER NOT NULL,

  -- メモ
  notes TEXT,

  -- 実行者
  performed_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- タイムスタンプ
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- インデックス
  CONSTRAINT check_valid_movement CHECK (
    (from_location_type IS NOT NULL AND from_location_type != to_location_type) OR
    (from_location_type IS NOT NULL AND from_site_id != to_site_id) OR
    movement_type IN ('調整', '棚卸')
  )
);

-- インデックス作成
CREATE INDEX idx_consumable_movements_org ON consumable_movements(organization_id);
CREATE INDEX idx_consumable_movements_tool ON consumable_movements(tool_id);
CREATE INDEX idx_consumable_movements_created ON consumable_movements(created_at DESC);

-- RLSポリシー設定
ALTER TABLE consumable_movements ENABLE ROW LEVEL SECURITY;

-- SELECT: 自組織のデータのみ閲覧可能
CREATE POLICY "Users can view their organization's consumable movements"
  ON consumable_movements
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- INSERT: 自組織のデータのみ作成可能
CREATE POLICY "Users can create consumable movements for their organization"
  ON consumable_movements
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- コメント
COMMENT ON TABLE consumable_movements IS '消耗品の移動履歴を記録するテーブル';
COMMENT ON COLUMN consumable_movements.movement_type IS '移動タイプ: 入庫/出庫/移動/調整/棚卸';
COMMENT ON COLUMN consumable_movements.quantity IS '移動数量（マイナスの場合は減少）';
