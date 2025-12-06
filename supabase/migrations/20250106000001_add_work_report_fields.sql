-- ========================================
-- 作業報告書の追加フィールド
-- ========================================

-- work_reports テーブルに特記事項と備考を追加
ALTER TABLE work_reports
ADD COLUMN IF NOT EXISTS special_notes TEXT,
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- work_reports テーブルに作業報告書ナンバーを追加
ALTER TABLE work_reports
ADD COLUMN IF NOT EXISTS report_number TEXT UNIQUE;

-- 作業報告書ナンバーのインデックス
CREATE INDEX IF NOT EXISTS idx_work_reports_report_number ON work_reports(report_number);

-- コメント追加
COMMENT ON COLUMN work_reports.special_notes IS '特記事項';
COMMENT ON COLUMN work_reports.remarks IS '備考';
COMMENT ON COLUMN work_reports.report_number IS '作業報告書ナンバー（例: WR-2025-001）';

-- ========================================
-- 作業報告書番号のシーケンステーブル
-- ========================================

CREATE TABLE IF NOT EXISTS work_report_number_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, year),
  CONSTRAINT fk_sequence_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_work_report_number_sequences_org_year
ON work_report_number_sequences(organization_id, year);

-- RLS有効化
ALTER TABLE work_report_number_sequences ENABLE ROW LEVEL SECURITY;

-- 自組織のシーケンスのみ閲覧可能
CREATE POLICY "Users can view own organization sequences"
ON work_report_number_sequences FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 自組織のシーケンスのみ作成・更新可能
CREATE POLICY "Users can manage own organization sequences"
ON work_report_number_sequences FOR ALL
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 更新日時自動更新トリガー
CREATE TRIGGER update_work_report_number_sequences_updated_at
  BEFORE UPDATE ON work_report_number_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE work_report_number_sequences IS '作業報告書番号の連番管理テーブル';
