-- ================================================================
-- Migration: Attendance Alert MVP (Phase 1)
-- Created: 2026-01-26
-- Description: 出退勤アラートシステムのMVP実装
--              - attendance_alertsテーブルの修正（title追加、alert_type制約更新）
--              - organization_attendance_settingsテーブルの拡張（休日・勤務時間設定）
-- ================================================================

-- ----------------------------------------------------------------
-- 1. attendance_alerts テーブル修正
-- ----------------------------------------------------------------

-- 1.1 title カラム追加
ALTER TABLE attendance_alerts
ADD COLUMN IF NOT EXISTS title TEXT;

-- 1.2 alert_type 制約の更新（'checkin_reminder' を追加）
ALTER TABLE attendance_alerts
DROP CONSTRAINT IF EXISTS attendance_alerts_alert_type_check;

ALTER TABLE attendance_alerts
ADD CONSTRAINT attendance_alerts_alert_type_check
CHECK (alert_type IN (
  'missing_checkin',
  'missing_checkout',
  'qr_expiring',
  'overtime',
  'checkin_reminder'  -- 新規追加
));

-- 1.3 コメント追加
COMMENT ON COLUMN attendance_alerts.title IS 'アラートのタイトル（例: 「出勤打刻漏れ」）';
COMMENT ON COLUMN attendance_alerts.alert_type IS 'アラート種別: missing_checkin, missing_checkout, qr_expiring, overtime, checkin_reminder';

-- ----------------------------------------------------------------
-- 2. organization_attendance_settings テーブル拡張
-- ----------------------------------------------------------------

-- 2.1 営業日設定カラム追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS working_days JSONB NOT NULL DEFAULT '{"mon":true,"tue":true,"wed":true,"thu":true,"fri":true,"sat":false,"sun":false}';

-- 2.2 祝日除外フラグ追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN DEFAULT true;

-- 2.3 デフォルト出勤時刻追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS default_checkin_time TIME DEFAULT '09:00';

-- 2.4 デフォルトアラート送信時刻追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS default_alert_time TIME DEFAULT '10:00';

-- 2.5 コメント追加
COMMENT ON COLUMN organization_attendance_settings.working_days IS '営業日設定（例: {"mon":true,"tue":true,...,"sun":false}）';
COMMENT ON COLUMN organization_attendance_settings.exclude_holidays IS '祝日を休日として扱うかどうか';
COMMENT ON COLUMN organization_attendance_settings.default_checkin_time IS 'デフォルト出勤時刻（全スタッフ共通）';
COMMENT ON COLUMN organization_attendance_settings.default_alert_time IS 'デフォルトアラート送信時刻';

-- ----------------------------------------------------------------
-- 3. 既存データのマイグレーション
-- ----------------------------------------------------------------

-- 3.1 既存レコードの title を NULL のままにする（後で生成ロジックで設定）
-- （既にデータがあれば title は NULL のまま）

-- 3.2 既存の organization_attendance_settings にデフォルト値を適用
-- （ALTER TABLE の DEFAULT 句により自動適用されるため、ここでは特に処理不要）

-- ================================================================
-- Migration End
-- ================================================================
