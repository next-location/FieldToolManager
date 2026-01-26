-- Migration 045: 勤務パターンにアラート設定を追加
-- 作成日: 2026-01-26
-- 目的: 各勤務パターンごとにアラートの有効/無効と送信タイミングを設定可能にする

-- alert_timeカラムを削除（不要になるため）
ALTER TABLE work_patterns DROP COLUMN IF EXISTS alert_time;

-- 新しいアラート設定カラムを追加
ALTER TABLE work_patterns
ADD COLUMN IF NOT EXISTS alert_enabled BOOLEAN DEFAULT true;

ALTER TABLE work_patterns
ADD COLUMN IF NOT EXISTS alert_hours_after DECIMAL(3,1) DEFAULT 2.0;

-- コメント追加
COMMENT ON COLUMN work_patterns.alert_enabled IS 'アラート有効フラグ（true: 有効, false: 無効）';
COMMENT ON COLUMN work_patterns.alert_hours_after IS 'アラート送信タイミング（出勤時刻の何時間後、例: 0.5=30分後, 1.0=1時間後, 2.0=2時間後）';

-- 既存の organization_attendance_settings の不要なカラムにコメント追加
COMMENT ON COLUMN organization_attendance_settings.default_alert_time IS '【非推奨】Phase 2では勤務パターンごとにアラート時刻を設定';
COMMENT ON COLUMN organization_attendance_settings.checkin_reminder_enabled IS '【非推奨】Phase 2では勤務パターンごとにアラート有効/無効を設定';
