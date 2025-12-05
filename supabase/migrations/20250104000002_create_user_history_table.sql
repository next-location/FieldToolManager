-- Migration: Create user_history table for audit logging
-- Created: 2025-01-04
-- Purpose: Phase 8.1 - Staff Management Feature (Change History)

-- Create user_history table
CREATE TABLE IF NOT EXISTS user_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES users(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'created',
    'updated',
    'deleted',
    'activated',
    'deactivated',
    'role_changed',
    'department_changed',
    'password_reset'
  )),
  old_values JSONB,
  new_values JSONB,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_history_organization ON user_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_history_user ON user_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_history_changed_by ON user_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_user_history_created_at ON user_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_history_change_type ON user_history(change_type);

-- Enable RLS
ALTER TABLE user_history ENABLE ROW LEVEL SECURITY;

-- Add table and column comments
COMMENT ON TABLE user_history IS 'スタッフの変更履歴（監査ログ）';
COMMENT ON COLUMN user_history.user_id IS '変更対象のユーザーID';
COMMENT ON COLUMN user_history.changed_by IS '変更を実行したユーザーID';
COMMENT ON COLUMN user_history.change_type IS '変更種別（作成/更新/削除/権限変更など）';
COMMENT ON COLUMN user_history.old_values IS '変更前の値（JSON形式）';
COMMENT ON COLUMN user_history.new_values IS '変更後の値（JSON形式）';
