-- 重機管理機能 Phase 7.1: データベース構築
-- 作成日: 2025-12-03

-- ==========================================
-- 1. 重機カテゴリテーブル
-- ==========================================

CREATE TABLE IF NOT EXISTS heavy_equipment_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,  -- NULL = システム標準
  name TEXT NOT NULL,
  code_prefix TEXT,  -- コード接頭辞（例: BH = バックホウ）
  icon TEXT,  -- アイコン名（UI用）
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_heavy_equipment_categories_org ON heavy_equipment_categories(organization_id);
CREATE INDEX idx_heavy_equipment_categories_sort ON heavy_equipment_categories(sort_order);

COMMENT ON TABLE heavy_equipment_categories IS '重機カテゴリマスタ';
COMMENT ON COLUMN heavy_equipment_categories.organization_id IS 'NULL = システム標準カテゴリ、UUID = 組織独自カテゴリ';

-- システム標準カテゴリの初期データ投入
INSERT INTO heavy_equipment_categories (name, code_prefix, icon, sort_order) VALUES
('バックホウ・油圧ショベル', 'BH', 'excavator', 10),
('ホイールローダー', 'WL', 'loader', 20),
('ダンプトラック', 'DT', 'truck', 30),
('クレーン車', 'CR', 'crane', 40),
('高所作業車', 'AW', 'aerial', 50),
('フォークリフト', 'FL', 'forklift', 60),
('ローラー・締固め機械', 'RL', 'roller', 70),
('その他', 'OT', 'other', 99)
ON CONFLICT DO NOTHING;

-- ==========================================
-- 2. 重機マスタテーブル
-- ==========================================

CREATE TABLE IF NOT EXISTS heavy_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  equipment_code TEXT NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES heavy_equipment_categories(id),
  manufacturer TEXT,
  model_number TEXT,

  -- 識別情報
  serial_number TEXT,
  registration_number TEXT,

  -- 所有形態（最重要）
  ownership_type TEXT NOT NULL CHECK (ownership_type IN ('owned', 'leased', 'rented')),

  -- リース・レンタル情報
  supplier_company TEXT,
  contract_number TEXT,
  contract_start_date DATE,
  contract_end_date DATE,
  monthly_cost DECIMAL(10, 2),

  -- 購入情報（自社所有のみ）
  purchase_date DATE,
  purchase_price DECIMAL(12, 2),

  -- ステータス管理
  status TEXT DEFAULT 'available' CHECK (status IN (
    'available',
    'in_use',
    'maintenance',
    'out_of_service'
  )),

  -- 現在地
  current_location_id UUID REFERENCES sites(id),
  current_user_id UUID REFERENCES users(id),

  -- 車検管理（必須）
  requires_vehicle_inspection BOOLEAN DEFAULT false,
  vehicle_inspection_date DATE,
  vehicle_inspection_reminder_days INTEGER DEFAULT 60,

  -- 保険管理（必須）
  insurance_company TEXT,
  insurance_policy_number TEXT,
  insurance_start_date DATE,
  insurance_end_date DATE,
  insurance_reminder_days INTEGER DEFAULT 60,

  -- メーター管理（オプション）
  enable_hour_meter BOOLEAN DEFAULT false,
  current_hour_meter DECIMAL(10, 1),

  -- 添付ファイル
  photo_url TEXT,
  qr_code TEXT UNIQUE,

  -- メタデータ
  notes TEXT,
  custom_fields JSONB DEFAULT '{}',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, equipment_code)
);

-- インデックス
CREATE INDEX idx_heavy_equipment_org ON heavy_equipment(organization_id);
CREATE INDEX idx_heavy_equipment_code ON heavy_equipment(organization_id, equipment_code);
CREATE INDEX idx_heavy_equipment_qr ON heavy_equipment(qr_code) WHERE qr_code IS NOT NULL;
CREATE INDEX idx_heavy_equipment_status ON heavy_equipment(status);
CREATE INDEX idx_heavy_equipment_ownership ON heavy_equipment(ownership_type);
CREATE INDEX idx_heavy_equipment_vehicle_inspection ON heavy_equipment(vehicle_inspection_date)
  WHERE requires_vehicle_inspection = true AND deleted_at IS NULL;
CREATE INDEX idx_heavy_equipment_insurance_expiry ON heavy_equipment(insurance_end_date)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_heavy_equipment_deleted ON heavy_equipment(deleted_at) WHERE deleted_at IS NULL;

-- コメント
COMMENT ON TABLE heavy_equipment IS '重機マスタ - 建設機械の基本情報・所有形態・車検保険管理';
COMMENT ON COLUMN heavy_equipment.ownership_type IS '所有形態: owned=自社所有, leased=リース, rented=レンタル';
COMMENT ON COLUMN heavy_equipment.enable_hour_meter IS 'メーター管理ON/OFF（顧客選択可能）';
COMMENT ON COLUMN heavy_equipment.qr_code IS '重機識別用QRコード（例: HE-001-UUID）';

-- ==========================================
-- 3. 重機使用記録テーブル
-- ==========================================

CREATE TABLE IF NOT EXISTS heavy_equipment_usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES heavy_equipment(id) ON DELETE CASCADE,

  -- 使用者
  user_id UUID NOT NULL REFERENCES users(id),

  -- 移動情報
  action_type TEXT NOT NULL CHECK (action_type IN ('checkout', 'checkin', 'transfer')),
  from_location_id UUID REFERENCES sites(id),
  to_location_id UUID REFERENCES sites(id),

  -- メーター記録（enable_hour_meterがtrueの場合のみ）
  hour_meter_reading DECIMAL(10, 1),

  -- タイムスタンプ
  action_at TIMESTAMPTZ DEFAULT NOW(),

  -- 備考
  notes TEXT,
  photo_urls TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_usage_records_org ON heavy_equipment_usage_records(organization_id);
CREATE INDEX idx_usage_records_equipment ON heavy_equipment_usage_records(equipment_id);
CREATE INDEX idx_usage_records_user ON heavy_equipment_usage_records(user_id);
CREATE INDEX idx_usage_records_action_at ON heavy_equipment_usage_records(action_at DESC);

COMMENT ON TABLE heavy_equipment_usage_records IS '重機使用記録 - 持出・返却・移動の履歴';
COMMENT ON COLUMN heavy_equipment_usage_records.action_type IS 'checkout=持出, checkin=返却, transfer=現場間移動';

-- ==========================================
-- 4. 重機点検記録テーブル
-- ==========================================

CREATE TABLE IF NOT EXISTS heavy_equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES heavy_equipment(id) ON DELETE CASCADE,

  -- 点検タイプ
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN (
    'vehicle_inspection',
    'insurance_renewal',
    'repair',
    'other'
  )),

  -- 実施情報
  maintenance_date DATE NOT NULL,
  performed_by TEXT,

  -- コスト
  cost DECIMAL(10, 2),

  -- 次回予定
  next_date DATE,

  -- 添付
  receipt_url TEXT,
  report_url TEXT,

  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_maintenance_org ON heavy_equipment_maintenance(organization_id);
CREATE INDEX idx_maintenance_equipment ON heavy_equipment_maintenance(equipment_id);
CREATE INDEX idx_maintenance_date ON heavy_equipment_maintenance(maintenance_date DESC);
CREATE INDEX idx_maintenance_type ON heavy_equipment_maintenance(maintenance_type);

COMMENT ON TABLE heavy_equipment_maintenance IS '重機点検記録 - 車検・保険更新・修理履歴';
COMMENT ON COLUMN heavy_equipment_maintenance.maintenance_type IS 'vehicle_inspection=車検, insurance_renewal=保険更新, repair=修理, other=その他';

-- ==========================================
-- 5. RLSポリシー設定
-- ==========================================

-- heavy_equipment
ALTER TABLE heavy_equipment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "heavy_equipment_select_own_org" ON heavy_equipment FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "heavy_equipment_insert_leader_admin" ON heavy_equipment FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

CREATE POLICY "heavy_equipment_update_leader_admin" ON heavy_equipment FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

CREATE POLICY "heavy_equipment_delete_admin" ON heavy_equipment FOR DELETE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- heavy_equipment_usage_records
ALTER TABLE heavy_equipment_usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usage_records_select_own_org" ON heavy_equipment_usage_records FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "usage_records_insert_authenticated" ON heavy_equipment_usage_records FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND user_id = auth.uid()
);

-- heavy_equipment_maintenance
ALTER TABLE heavy_equipment_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_select_own_org" ON heavy_equipment_maintenance FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "maintenance_insert_leader_admin" ON heavy_equipment_maintenance FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

-- ==========================================
-- 6. 更新日時トリガー
-- ==========================================

CREATE OR REPLACE FUNCTION update_heavy_equipment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_heavy_equipment_updated_at
  BEFORE UPDATE ON heavy_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_heavy_equipment_updated_at();
