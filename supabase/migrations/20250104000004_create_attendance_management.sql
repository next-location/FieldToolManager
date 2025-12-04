-- ============================================================
-- 出退勤管理機能 Phase 1: 基本テーブル作成
-- ============================================================

-- btree_gist拡張を有効化（EXCLUDE制約でUUIDを使うために必要）
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1. 組織の出退勤設定テーブル
CREATE TABLE organization_attendance_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),

  -- 会社出勤設定
  office_attendance_enabled BOOLEAN DEFAULT true,
  office_clock_methods JSONB NOT NULL DEFAULT '{"manual":true,"qr_scan":false,"qr_display":false}',
  office_qr_rotation_days INTEGER DEFAULT 7 CHECK (office_qr_rotation_days IN (1, 3, 7, 30)),

  -- 現場出勤設定
  site_attendance_enabled BOOLEAN DEFAULT true,
  site_clock_methods JSONB NOT NULL DEFAULT '{"manual":true,"qr_scan":false,"qr_display":false}',
  site_qr_type TEXT DEFAULT 'leader' CHECK (site_qr_type IN ('leader', 'fixed', 'both')),

  -- 休憩時間設定
  break_time_mode TEXT DEFAULT 'simple' CHECK (break_time_mode IN ('none', 'simple', 'detailed')),
  auto_break_deduction BOOLEAN DEFAULT false,
  auto_break_minutes INTEGER DEFAULT 45,

  -- 通知設定
  checkin_reminder_enabled BOOLEAN DEFAULT true,
  checkin_reminder_time TIME DEFAULT '10:00',
  checkout_reminder_enabled BOOLEAN DEFAULT true,
  checkout_reminder_time TIME DEFAULT '20:00',
  admin_daily_report_enabled BOOLEAN DEFAULT true,
  admin_daily_report_time TIME DEFAULT '10:00',
  admin_daily_report_email BOOLEAN DEFAULT true,
  qr_expiry_alert_enabled BOOLEAN DEFAULT true,
  qr_expiry_alert_email BOOLEAN DEFAULT true,
  overtime_alert_enabled BOOLEAN DEFAULT false,
  overtime_alert_hours INTEGER DEFAULT 12,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE organization_attendance_settings IS '組織ごとの出退勤管理設定';
COMMENT ON COLUMN organization_attendance_settings.office_clock_methods IS '会社出勤の打刻方法（manual/qr_scan/qr_display）';
COMMENT ON COLUMN organization_attendance_settings.office_qr_rotation_days IS 'QRコード更新頻度（1/3/7/30日）';
COMMENT ON COLUMN organization_attendance_settings.site_qr_type IS '現場QRタイプ（leader=リーダー発行/fixed=固定/both=両方）';
COMMENT ON COLUMN organization_attendance_settings.break_time_mode IS '休憩時間管理モード（none=なし/simple=開始終了/detailed=複数回）';

-- 2. 現場ごとの出退勤設定
CREATE TABLE site_attendance_settings (
  site_id UUID PRIMARY KEY REFERENCES sites(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qr_mode TEXT NOT NULL DEFAULT 'leader' CHECK (qr_mode IN ('leader', 'fixed')),
  has_tablet BOOLEAN DEFAULT false,
  tablet_access_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE site_attendance_settings IS '現場ごとの出退勤設定';
COMMENT ON COLUMN site_attendance_settings.qr_mode IS 'QRモード（leader=リーダー発行/fixed=固定QR）';
COMMENT ON COLUMN site_attendance_settings.has_tablet IS 'タブレット設置有無';
COMMENT ON COLUMN site_attendance_settings.tablet_access_token IS 'タブレットアクセストークン';

-- 3. 会社QRコード
CREATE TABLE office_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qr_data TEXT NOT NULL UNIQUE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 有効期間の重複防止
  EXCLUDE USING gist (
    organization_id WITH =,
    tstzrange(valid_from, valid_until) WITH &&
  ) WHERE (is_active = true)
);

COMMENT ON TABLE office_qr_codes IS '会社出勤用QRコード（自動更新型）';
COMMENT ON COLUMN office_qr_codes.qr_data IS 'QRコードデータ（暗号化トークン）';
COMMENT ON COLUMN office_qr_codes.valid_from IS '有効期間開始';
COMMENT ON COLUMN office_qr_codes.valid_until IS '有効期間終了';

CREATE INDEX idx_office_qr_codes_org_active ON office_qr_codes(organization_id, is_active);
CREATE INDEX idx_office_qr_codes_qr_data ON office_qr_codes(qr_data);

-- 4. 出退勤記録
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,

  -- 出勤情報
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_location_type TEXT NOT NULL CHECK (clock_in_location_type IN ('office', 'site', 'remote')),
  clock_in_site_id UUID REFERENCES sites(id),
  clock_in_method TEXT NOT NULL CHECK (clock_in_method IN ('manual', 'qr')),
  clock_in_device_type TEXT CHECK (clock_in_device_type IN ('mobile', 'tablet', 'desktop')),

  -- 退勤予定
  planned_checkout_location_type TEXT CHECK (planned_checkout_location_type IN ('office', 'site', 'remote', 'direct_home')),
  planned_checkout_site_id UUID REFERENCES sites(id),

  -- 退勤情報（実績）
  clock_out_time TIMESTAMPTZ,
  clock_out_location_type TEXT CHECK (clock_out_location_type IN ('office', 'site', 'remote', 'direct_home')),
  clock_out_site_id UUID REFERENCES sites(id),
  clock_out_method TEXT CHECK (clock_out_method IN ('manual', 'qr')),
  clock_out_device_type TEXT CHECK (clock_out_device_type IN ('mobile', 'tablet', 'desktop')),

  -- 休憩時間
  break_records JSONB DEFAULT '[]',
  -- 例: [{"start": "2025-12-04T12:00:00Z", "end": "2025-12-04T12:45:00Z"}]

  auto_break_deducted_minutes INTEGER DEFAULT 0,

  -- メタ情報
  notes TEXT,
  is_offline_sync BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  is_manually_edited BOOLEAN DEFAULT false,
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ,
  edited_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1日1レコード制約
  UNIQUE(organization_id, user_id, date)
);

COMMENT ON TABLE attendance_records IS '出退勤記録';
COMMENT ON COLUMN attendance_records.clock_in_location_type IS '出勤場所（office=会社/site=現場/remote=リモート）';
COMMENT ON COLUMN attendance_records.clock_in_method IS '打刻方法（manual=手動/qr=QRスキャン）';
COMMENT ON COLUMN attendance_records.planned_checkout_location_type IS '退勤予定場所（office/site/remote/direct_home=直帰）';
COMMENT ON COLUMN attendance_records.break_records IS '休憩時間記録（JSONB配列）';
COMMENT ON COLUMN attendance_records.auto_break_deducted_minutes IS '自動休憩控除時間（分）';
COMMENT ON COLUMN attendance_records.is_manually_edited IS '手動修正フラグ';
COMMENT ON COLUMN attendance_records.edited_by IS '修正者';

CREATE INDEX idx_attendance_records_org ON attendance_records(organization_id);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_attendance_records_date ON attendance_records(date DESC);
CREATE INDEX idx_attendance_records_org_date ON attendance_records(organization_id, date DESC);

-- ============================================================
-- RLS ポリシー
-- ============================================================

-- 1. organization_attendance_settings
ALTER TABLE organization_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can manage their own settings"
  ON organization_attendance_settings
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 2. site_attendance_settings
ALTER TABLE site_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's site settings"
  ON site_attendance_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage site settings"
  ON site_attendance_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- 3. office_qr_codes
ALTER TABLE office_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's QR codes"
  ON office_qr_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage QR codes"
  ON office_qr_codes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- 4. attendance_records
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance records"
  ON attendance_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance records"
  ON attendance_records FOR UPDATE
  USING (auth.uid() = user_id AND is_manually_edited = false);

CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage all attendance records"
  ON attendance_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
