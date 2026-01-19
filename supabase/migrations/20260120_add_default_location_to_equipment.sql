-- 重機にデフォルト保管場所を追加
-- 返却時に自動的にこの場所に戻る

-- Step 1: default_location_id カラムを追加
ALTER TABLE heavy_equipment
ADD COLUMN default_location_id UUID REFERENCES sites(id);

-- Step 2: コメント追加
COMMENT ON COLUMN heavy_equipment.default_location_id IS 'デフォルトの保管場所（返却時に自動的にここに戻る）';

-- Step 3: インデックス追加
CREATE INDEX idx_heavy_equipment_default_location
  ON heavy_equipment(default_location_id)
  WHERE default_location_id IS NOT NULL;

-- Note: 既存データは手動で設定する必要がある（現在2件のみ）
