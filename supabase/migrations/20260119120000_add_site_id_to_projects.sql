-- Phase 1: 工事テーブルに現場IDを追加
-- プロジェクト/現場統合計画 (PROJECT_SITE_INTEGRATION_PLAN.md) に基づく実装

-- Step 1: site_id カラムを追加（NULL許可、外部キー制約付き）
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id) ON DELETE SET NULL;

-- Step 2: インデックス作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_projects_site_id ON projects(site_id);

-- Step 3: コメント追加（カラムの目的を明確化）
COMMENT ON COLUMN projects.site_id IS '関連する現場ID（sites テーブル参照）。工事が特定の現場で行われる場合に設定。NULL 許可（現場に紐付かない工事も存在可能）';

-- Step 4: 既存データの整合性確認用ビュー（デバッグ用）
-- このビューで site_id が NULL の工事を確認可能
CREATE OR REPLACE VIEW v_projects_without_site AS
SELECT
  p.id,
  p.project_name,
  p.project_code,
  p.status,
  p.organization_id,
  o.name as organization_name
FROM projects p
LEFT JOIN organizations o ON p.organization_id = o.id
WHERE p.site_id IS NULL;

COMMENT ON VIEW v_projects_without_site IS '現場に紐付いていない工事の一覧（デバッグ・運用確認用）';
