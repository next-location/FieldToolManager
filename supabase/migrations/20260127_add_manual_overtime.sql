-- Migration: 手動残業時間フィールド追加
-- 作成日: 2026-01-27
-- 目的: シフト制スタッフの残業時間を管理者が手動で記録できるようにする

-- attendance_recordsテーブルに手動残業時間フィールドを追加
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS manual_overtime_minutes INTEGER DEFAULT 0;

-- コメント追加
COMMENT ON COLUMN attendance_records.manual_overtime_minutes IS 'シフト制スタッフの手動入力残業時間（分）- 管理者/マネージャーが手動で設定';

-- インデックスは不要（検索条件として使用しないため）
