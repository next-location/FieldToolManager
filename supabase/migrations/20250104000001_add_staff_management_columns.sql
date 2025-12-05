-- Migration: Add staff management columns to users table
-- Created: 2025-01-04
-- Purpose: Phase 8.1 - Staff Management Feature

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_expires_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(department) WHERE department IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON users(employee_id) WHERE employee_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Add column comments
COMMENT ON COLUMN users.department IS '所属部署（例: 工事部、営業部）';
COMMENT ON COLUMN users.employee_id IS '社員番号（組織内で一意）';
COMMENT ON COLUMN users.phone IS '電話番号（連絡先）';
COMMENT ON COLUMN users.is_active IS 'アカウント有効状態。falseの場合ログイン不可';
COMMENT ON COLUMN users.invited_at IS 'スタッフ招待日時';
COMMENT ON COLUMN users.last_login_at IS '最終ログイン日時（アクティビティ追跡用）';
COMMENT ON COLUMN users.password_reset_token IS 'パスワードリセット用のワンタイムトークン';
COMMENT ON COLUMN users.password_reset_expires_at IS 'パスワードリセットトークンの有効期限';
COMMENT ON COLUMN users.access_expires_at IS '一時アクセス期限（将来の短期スタッフ機能用）';

-- Update existing users to have is_active = true by default
UPDATE users SET is_active = true WHERE is_active IS NULL;
