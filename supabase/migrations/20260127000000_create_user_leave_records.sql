-- Migration: Create user_leave_records table for Phase 3
-- Date: 2026-01-27
-- Description: 休暇管理機能のテーブル作成

-- user_leave_records テーブル作成
CREATE TABLE IF NOT EXISTS user_leave_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'sick', 'personal', 'other')),
  reason TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leave_date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_leave_org_date ON user_leave_records(organization_id, leave_date);
CREATE INDEX IF NOT EXISTS idx_user_leave_user_date ON user_leave_records(user_id, leave_date);
CREATE INDEX IF NOT EXISTS idx_user_leave_status ON user_leave_records(organization_id, status);

-- RLS有効化
ALTER TABLE user_leave_records ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: スタッフは自分の休暇を閲覧可能
CREATE POLICY "Users can view own leaves"
  ON user_leave_records FOR SELECT
  USING (auth.uid() = user_id);

-- RLSポリシー: 管理者・マネージャーは全員の休暇を閲覧可能
CREATE POLICY "Admins can view all leaves"
  ON user_leave_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- RLSポリシー: スタッフは自分の休暇を申請可能
CREATE POLICY "Users can create own leaves"
  ON user_leave_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLSポリシー: 管理者・マネージャーは全ての休暇を管理可能
CREATE POLICY "Admins can manage all leaves"
  ON user_leave_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- コメント追加
COMMENT ON TABLE user_leave_records IS 'スタッフの休暇記録（有給、病欠など）';
COMMENT ON COLUMN user_leave_records.leave_type IS '休暇種別: paid=有給, sick=病欠, personal=私用, other=その他';
COMMENT ON COLUMN user_leave_records.status IS 'ステータス: pending=承認待ち, approved=承認済み, rejected=却下';
