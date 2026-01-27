-- Migration: シフト制フラグ追加
-- 作成日: 2026-01-27
-- 目的: スタッフごとに「固定勤務パターン」か「シフト制」かを選択可能にする

-- usersテーブルにシフト制フラグを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS is_shift_work BOOLEAN DEFAULT false;

-- コメント追加
COMMENT ON COLUMN users.is_shift_work IS 'シフト制フラグ（true: シフト制（打刻ベース記録、残業自動計算なし）、false: 固定勤務パターン（残業自動計算あり））';

-- インデックス作成（検索最適化）
CREATE INDEX IF NOT EXISTS idx_users_is_shift_work ON users(organization_id, is_shift_work);
