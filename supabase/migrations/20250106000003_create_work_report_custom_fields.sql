-- ========================================
-- 作業報告書カスタムフィールド定義テーブル
-- ========================================

-- カスタムフィールド定義テーブル
CREATE TABLE IF NOT EXISTS work_report_custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE, -- NULLの場合は組織全体で利用可能

  -- フィールド定義
  field_key TEXT NOT NULL, -- 内部識別子（例: custom_weather, custom_equipment_count）
  field_label TEXT NOT NULL, -- 表示名（例: 天気, 使用機材数）
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'textarea', 'number', 'date', 'select', 'checkbox')),

  -- select/checkboxタイプの場合の選択肢
  field_options JSONB, -- 例: ["晴れ", "曇り", "雨"]

  -- 表示設定
  display_order INTEGER NOT NULL DEFAULT 0, -- 表示順序
  is_required BOOLEAN DEFAULT false, -- 必須フィールドかどうか
  placeholder TEXT, -- プレースホルダー
  help_text TEXT, -- ヘルプテキスト

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- ユニーク制約: 同じ組織/現場内で同じfield_keyは使えない
  UNIQUE(organization_id, site_id, field_key)
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_custom_fields_organization_id
ON work_report_custom_fields(organization_id);

CREATE INDEX IF NOT EXISTS idx_custom_fields_site_id
ON work_report_custom_fields(site_id);

CREATE INDEX IF NOT EXISTS idx_custom_fields_display_order
ON work_report_custom_fields(display_order);

-- RLS有効化
ALTER TABLE work_report_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 同じ組織のユーザーのみアクセス可能
CREATE POLICY "Users can view custom fields in their organization"
ON work_report_custom_fields FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage custom fields"
ON work_report_custom_fields FOR ALL
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- ========================================
-- work_reportsテーブルにカスタムフィールドデータ保存カラムを追加
-- ========================================

ALTER TABLE work_reports
ADD COLUMN IF NOT EXISTS custom_fields_data JSONB DEFAULT '{}'::jsonb;

-- カスタムフィールドデータのインデックス（検索用）
CREATE INDEX IF NOT EXISTS idx_work_reports_custom_fields_data
ON work_reports USING gin(custom_fields_data);

-- コメント
COMMENT ON TABLE work_report_custom_fields IS '作業報告書のカスタムフィールド定義テーブル';
COMMENT ON COLUMN work_report_custom_fields.field_key IS 'フィールドの内部識別子（例: custom_weather）';
COMMENT ON COLUMN work_report_custom_fields.field_label IS '画面表示用のラベル（例: 天気）';
COMMENT ON COLUMN work_report_custom_fields.field_type IS 'フィールドタイプ: text, textarea, number, date, select, checkbox';
COMMENT ON COLUMN work_report_custom_fields.field_options IS 'select/checkboxタイプの選択肢配列（JSONB）';
COMMENT ON COLUMN work_reports.custom_fields_data IS 'カスタムフィールドの値を保存（JSONB形式）';
