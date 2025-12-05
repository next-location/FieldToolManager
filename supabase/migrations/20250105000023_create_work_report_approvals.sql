-- 作業報告書承認履歴テーブル
CREATE TABLE work_report_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,

  -- 承認者情報
  approver_id UUID NOT NULL REFERENCES users(id),
  approver_name TEXT NOT NULL,

  -- 承認アクション
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  comment TEXT, -- 承認/却下時のコメント

  -- タイムスタンプ
  approved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_work_report_approvals_organization ON work_report_approvals(organization_id);
CREATE INDEX idx_work_report_approvals_work_report ON work_report_approvals(work_report_id);
CREATE INDEX idx_work_report_approvals_approver ON work_report_approvals(approver_id);
CREATE INDEX idx_work_report_approvals_approved_at ON work_report_approvals(approved_at DESC);

-- RLS有効化
ALTER TABLE work_report_approvals ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 同じ組織のユーザーは閲覧可能
CREATE POLICY "Users can view approvals in their organization"
ON work_report_approvals FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- RLSポリシー: leader/admin は承認アクションを作成可能
CREATE POLICY "Leaders and admins can create approvals"
ON work_report_approvals FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

COMMENT ON TABLE work_report_approvals IS '作業報告書の承認履歴を記録するテーブル';
COMMENT ON COLUMN work_report_approvals.action IS '承認アクション: approved=承認, rejected=却下';
COMMENT ON COLUMN work_report_approvals.comment IS '承認/却下時のコメント（任意）';
