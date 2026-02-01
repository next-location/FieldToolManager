-- =========================================
-- Migration #054: GPS打刻機能の追加
-- 実行日: 2025-02-01
-- 概要: GPS位置情報を使用した打刻機能の実装
-- =========================================

-- 1. attendance_records テーブルに位置情報カラムを追加
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS clock_in_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clock_in_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS clock_in_accuracy INTEGER, -- 精度（メートル）
ADD COLUMN IF NOT EXISTS clock_out_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clock_out_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS clock_out_accuracy INTEGER; -- 精度（メートル）

-- コメント追加
COMMENT ON COLUMN attendance_records.clock_in_latitude IS '出勤時の緯度';
COMMENT ON COLUMN attendance_records.clock_in_longitude IS '出勤時の経度';
COMMENT ON COLUMN attendance_records.clock_in_accuracy IS '出勤時のGPS精度（メートル）';
COMMENT ON COLUMN attendance_records.clock_out_latitude IS '退勤時の緯度';
COMMENT ON COLUMN attendance_records.clock_out_longitude IS '退勤時の経度';
COMMENT ON COLUMN attendance_records.clock_out_accuracy IS '退勤時のGPS精度（メートル）';

-- 2. organization_attendance_settings テーブルにGPS設定を追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS gps_requirement TEXT DEFAULT 'none' CHECK (gps_requirement IN ('none', 'all', 'shift_only', 'shift_night')),
ADD COLUMN IF NOT EXISTS gps_radius INTEGER DEFAULT 100; -- 許容範囲（メートル）

-- コメント追加
COMMENT ON COLUMN organization_attendance_settings.gps_requirement IS 'GPS打刻要件: none=不要, all=全員必須, shift_only=シフト制のみ, shift_night=シフト制と夜勤のみ';
COMMENT ON COLUMN organization_attendance_settings.gps_radius IS 'GPS許容範囲（メートル）';

-- 3. sites テーブルに位置情報カラムを追加（打刻可能エリア定義用）
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS gps_radius INTEGER DEFAULT 100; -- この現場の許容範囲

-- コメント追加
COMMENT ON COLUMN sites.latitude IS '現場の緯度（GPS打刻用）';
COMMENT ON COLUMN sites.longitude IS '現場の経度（GPS打刻用）';
COMMENT ON COLUMN sites.gps_radius IS '現場のGPS許容範囲（メートル）';

-- 4. 打刻可能エリアテーブルの新規作成（複数エリア対応用）
CREATE TABLE IF NOT EXISTS attendance_allowed_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INTEGER NOT NULL DEFAULT 100, -- 許容範囲（メートル）
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_attendance_allowed_areas_org ON attendance_allowed_areas(organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_allowed_areas_active ON attendance_allowed_areas(organization_id, is_active);

-- RLS有効化
ALTER TABLE attendance_allowed_areas ENABLE ROW LEVEL SECURITY;

-- RLSポリシー作成
CREATE POLICY "Admins can manage allowed areas"
  ON attendance_allowed_areas FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- =========================================
-- ロールバック用SQL（必要時のみ実行）
-- =========================================
/*
-- attendance_records からGPSカラムを削除
ALTER TABLE attendance_records
DROP COLUMN IF EXISTS clock_in_latitude,
DROP COLUMN IF EXISTS clock_in_longitude,
DROP COLUMN IF EXISTS clock_in_accuracy,
DROP COLUMN IF EXISTS clock_out_latitude,
DROP COLUMN IF EXISTS clock_out_longitude,
DROP COLUMN IF EXISTS clock_out_accuracy;

-- organization_attendance_settings からGPS設定を削除
ALTER TABLE organization_attendance_settings
DROP COLUMN IF EXISTS gps_requirement,
DROP COLUMN IF EXISTS gps_radius;

-- sites から位置情報カラムを削除
ALTER TABLE sites
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude,
DROP COLUMN IF EXISTS gps_radius;

-- attendance_allowed_areas テーブルを削除
DROP TABLE IF EXISTS attendance_allowed_areas;
*/