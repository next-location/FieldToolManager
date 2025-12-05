-- 作業報告書テンプレートテーブル
CREATE TABLE work_report_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,

  -- テンプレートデータ
  weather TEXT,
  work_location TEXT,
  progress_rate INTEGER,
  materials_used TEXT,
  tools_used TEXT,
  next_tasks TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- インデックス
CREATE INDEX idx_work_report_templates_organization_id ON work_report_templates(organization_id);
CREATE INDEX idx_work_report_templates_created_by ON work_report_templates(created_by);
CREATE INDEX idx_work_report_templates_deleted_at ON work_report_templates(deleted_at);

-- RLSポリシー
ALTER TABLE work_report_templates ENABLE ROW LEVEL SECURITY;

-- 自組織のテンプレートのみ閲覧可能
CREATE POLICY "Users can view templates in their organization" ON work_report_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 自組織のテンプレート作成
CREATE POLICY "Users can create templates in their organization" ON work_report_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- 自分が作成したテンプレートのみ更新可能
CREATE POLICY "Users can update their own templates" ON work_report_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 自分が作成したテンプレートのみ削除可能（論理削除）
CREATE POLICY "Users can delete their own templates" ON work_report_templates
  FOR DELETE
  USING (created_by = auth.uid());
