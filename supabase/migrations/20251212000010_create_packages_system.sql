-- パッケージマスタテーブル
CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  monthly_fee INTEGER NOT NULL, -- 月額料金（円）
  is_active BOOLEAN DEFAULT true, -- 有効/無効
  display_order INTEGER DEFAULT 0, -- 表示順
  package_key TEXT UNIQUE NOT NULL, -- システム内部で使用するキー（has_asset_package等）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- パッケージ機能テーブル（パッケージに含まれる機能のリスト）
CREATE TABLE package_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL, -- 機能名
  feature_key TEXT, -- 機能フラグシステムで使用するキー（例: asset.tool_management）
  is_header BOOLEAN DEFAULT false, -- 【】で囲むヘッダー表示かどうか
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- パッケージ選択テーブル（契約とパッケージの紐付け）
CREATE TABLE contract_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contract_id, package_id)
);

-- インデックス
CREATE INDEX idx_packages_active ON packages(is_active);
CREATE INDEX idx_packages_display_order ON packages(display_order);
CREATE INDEX idx_package_features_package_id ON package_features(package_id);
CREATE INDEX idx_package_features_display_order ON package_features(display_order);
CREATE INDEX idx_contract_packages_contract_id ON contract_packages(contract_id);
CREATE INDEX idx_contract_packages_package_id ON contract_packages(package_id);

-- 更新日時の自動更新トリガー
CREATE TRIGGER update_packages_updated_at
  BEFORE UPDATE ON packages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Super Adminのみアクセス可能
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE package_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_packages ENABLE ROW LEVEL SECURITY;

-- Super Admin用のポリシー
CREATE POLICY "Super admin full access to packages"
  ON packages FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access to package_features"
  ON package_features FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access to contract_packages"
  ON contract_packages FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

-- 初期データ投入（既存の3パッケージ）
INSERT INTO packages (name, description, monthly_fee, package_key, display_order) VALUES
('現場資産パック', '道具管理、重機管理、在庫管理などの資産管理機能', 18000, 'has_asset_package', 1),
('現場DX業務効率化パック', '勤怠管理、作業報告書、帳票管理などの業務効率化機能', 22000, 'has_dx_efficiency_package', 2),
('フル機能統合パック', '全機能が利用可能（割引適用）', 32000, 'has_both_packages', 3);

-- 現場資産パックの機能
INSERT INTO package_features (package_id, feature_name, feature_key, display_order)
SELECT id, '道具マスタ管理', 'asset.tool_management', 1 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, '道具個別管理（QRコード）', 'asset.qr_code', 2 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, '消耗品管理（数量・在庫管理）', 'asset.consumables', 3 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, '重機管理（稼働状況・コスト管理）', 'asset.equipment', 4 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, '各種アラート機能（低在庫・メンテナンス通知）', 'asset.alerts', 5 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, 'QRコード一括生成', 'asset.qr_bulk', 6 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, '棚卸し機能', 'asset.inventory', 7 FROM packages WHERE package_key = 'has_asset_package'
UNION ALL
SELECT id, '移動履歴管理', 'asset.movement_history', 8 FROM packages WHERE package_key = 'has_asset_package';

-- 現場DX業務効率化パックの機能
INSERT INTO package_features (package_id, feature_name, feature_key, display_order)
SELECT id, '勤怠管理（出退勤打刻）', 'dx.attendance', 1 FROM packages WHERE package_key = 'has_dx_efficiency_package'
UNION ALL
SELECT id, '作業報告書作成', 'dx.work_reports', 2 FROM packages WHERE package_key = 'has_dx_efficiency_package'
UNION ALL
SELECT id, '見積書・請求書・領収書作成', 'dx.invoices', 3 FROM packages WHERE package_key = 'has_dx_efficiency_package'
UNION ALL
SELECT id, '売上管理', 'dx.revenue', 4 FROM packages WHERE package_key = 'has_dx_efficiency_package'
UNION ALL
SELECT id, '承認ワークフロー', 'dx.approval', 5 FROM packages WHERE package_key = 'has_dx_efficiency_package'
UNION ALL
SELECT id, '財務分析（売上分析・資金繰り予測）', 'dx.analytics', 6 FROM packages WHERE package_key = 'has_dx_efficiency_package';

-- フル機能統合パックの機能
INSERT INTO package_features (package_id, feature_name, is_header, display_order)
SELECT id, '【現場資産パックの全機能】', true, 1 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '道具マスタ管理', false, 2 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '道具個別管理（QRコード）', false, 3 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '消耗品管理（数量・在庫管理）', false, 4 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '重機管理（稼働状況・コスト管理）', false, 5 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '各種アラート機能', false, 6 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, 'QRコード一括生成', false, 7 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '棚卸し機能', false, 8 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '移動履歴管理', false, 9 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '【現場DX業務効率化パックの全機能】', true, 10 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '勤怠管理（出退勤打刻）', false, 11 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '作業報告書作成', false, 12 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '見積書・請求書・領収書作成', false, 13 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '売上管理', false, 14 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '承認ワークフロー', false, 15 FROM packages WHERE package_key = 'has_both_packages'
UNION ALL
SELECT id, '財務分析（売上分析・資金繰り予測）', false, 16 FROM packages WHERE package_key = 'has_both_packages';

COMMENT ON TABLE packages IS 'パッケージマスタ - Super Adminが管理する機能パッケージ';
COMMENT ON TABLE package_features IS 'パッケージに含まれる機能のリスト';
COMMENT ON TABLE contract_packages IS '契約とパッケージの紐付け';
