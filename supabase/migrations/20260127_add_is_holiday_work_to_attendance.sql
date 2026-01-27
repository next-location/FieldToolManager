-- Migration: 休日出勤フラグ追加
-- 作成日: 2026-01-27
-- 目的: attendance_recordsテーブルに休日出勤フラグを追加

-- is_holiday_workカラムを追加
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS is_holiday_work BOOLEAN DEFAULT false;

-- インデックス追加（休日出勤記録の検索用）
CREATE INDEX IF NOT EXISTS idx_attendance_records_holiday_work
ON attendance_records(organization_id, is_holiday_work)
WHERE is_holiday_work = true;

-- コメント
COMMENT ON COLUMN attendance_records.is_holiday_work IS '休日出勤フラグ（祝日・休日の勤務の場合はtrue）';
