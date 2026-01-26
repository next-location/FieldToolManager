-- Migration 044: 勤務パターンテーブル作成（Phase 2: 夜勤対応）
-- 作成日: 2026-01-26
-- 目的: 複数の勤務パターン（日勤、夜勤、早朝勤務など）に対応

-- work_patternsテーブル作成
CREATE TABLE IF NOT EXISTS work_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- 例: "日勤（標準）", "夜勤", "早朝"
  expected_checkin_time TIME NOT NULL,  -- 例: 08:00
  alert_time TIME NOT NULL,  -- 例: 09:00
  is_night_shift BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,  -- デフォルトパターン
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_work_patterns_org ON work_patterns(organization_id);
CREATE INDEX IF NOT EXISTS idx_work_patterns_default ON work_patterns(organization_id, is_default) WHERE is_default = true;

-- RLS設定
ALTER TABLE work_patterns ENABLE ROW LEVEL SECURITY;

-- ポリシー: 組織のユーザーは自組織の勤務パターンを閲覧可能
CREATE POLICY "Users can view own organization work patterns"
  ON work_patterns
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ポリシー: 管理者・マネージャーは自組織の勤務パターンを管理可能
CREATE POLICY "Admins can manage own organization work patterns"
  ON work_patterns
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- usersテーブルに勤務パターンIDを追加
ALTER TABLE users
ADD COLUMN IF NOT EXISTS work_pattern_id UUID REFERENCES work_patterns(id) ON DELETE SET NULL;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_users_work_pattern ON users(work_pattern_id);

-- コメント追加
COMMENT ON TABLE work_patterns IS '勤務パターン（日勤、夜勤、早朝勤務など）';
COMMENT ON COLUMN work_patterns.name IS 'パターン名（例: 日勤（標準）、夜勤）';
COMMENT ON COLUMN work_patterns.expected_checkin_time IS '想定出勤時刻';
COMMENT ON COLUMN work_patterns.alert_time IS 'アラート送信時刻';
COMMENT ON COLUMN work_patterns.is_night_shift IS '夜勤フラグ（日付をまたぐ勤務）';
COMMENT ON COLUMN work_patterns.is_default IS 'デフォルトパターンフラグ（新規スタッフに適用）';
COMMENT ON COLUMN users.work_pattern_id IS '適用される勤務パターン';
