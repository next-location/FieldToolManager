-- ========================================
-- 作業報告書機能テーブル作成
-- ========================================

-- 1. work_reports テーブル（作業報告書本体）
CREATE TABLE work_reports (
  -- ID
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- コア項目（必須）
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  report_date DATE NOT NULL,
  weather TEXT CHECK (weather IN ('sunny', 'cloudy', 'rainy', 'snowy', '')),
  description TEXT NOT NULL, -- 作業内容

  -- 作業時間
  work_start_time TIME,
  work_end_time TIME,
  break_minutes INTEGER DEFAULT 0 CHECK (break_minutes >= 0), -- 休憩時間（分）

  -- 作業者情報（JSONB配列）
  workers JSONB NOT NULL DEFAULT '[]',
  -- [{ user_id: UUID, name: string, work_hours: number }]

  -- よく使う項目（オプション）
  work_location TEXT, -- 作業箇所（例: 2階リビング）
  progress_rate INTEGER CHECK (progress_rate >= 0 AND progress_rate <= 100), -- 進捗率 0-100%
  materials_used TEXT[], -- 使用材料
  tools_used UUID[], -- 使用道具（tool_items.id参照）

  -- 安全・品質
  safety_incidents BOOLEAN DEFAULT false, -- 安全上の事故の有無
  safety_incident_details TEXT, -- 事故詳細
  quality_issues BOOLEAN DEFAULT false, -- 品質問題の有無
  quality_issue_details TEXT, -- 品質問題詳細

  -- 顧客対応
  client_contact BOOLEAN DEFAULT false, -- 顧客対応の有無
  client_contact_details TEXT, -- 対応内容

  -- 次回作業
  next_tasks TEXT, -- 次回作業予定

  -- カスタムフィールド（JSONB）
  custom_fields JSONB DEFAULT '{}',

  -- 承認フロー
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- メタデータ
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックス
CREATE INDEX idx_work_reports_organization ON work_reports(organization_id);
CREATE INDEX idx_work_reports_site ON work_reports(site_id);
CREATE INDEX idx_work_reports_date ON work_reports(report_date DESC);
CREATE INDEX idx_work_reports_status ON work_reports(status);
CREATE INDEX idx_work_reports_created_by ON work_reports(created_by);
CREATE INDEX idx_work_reports_deleted_at ON work_reports(deleted_at);

-- 複合インデックス
CREATE INDEX idx_work_reports_org_date ON work_reports(organization_id, report_date DESC);
CREATE INDEX idx_work_reports_site_date ON work_reports(site_id, report_date DESC);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_work_reports_updated_at
  BEFORE UPDATE ON work_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================

-- 2. work_report_photos テーブル（写真管理）
CREATE TABLE work_report_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,

  -- 写真情報
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after', 'issue', 'other')),
  caption TEXT, -- 説明文

  -- 位置情報（オプション）
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- メタデータ
  file_size BIGINT, -- バイト数
  mime_type TEXT,

  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_photo_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_photo_work_report FOREIGN KEY (work_report_id) REFERENCES work_reports(id)
);

-- インデックス
CREATE INDEX idx_work_report_photos_report ON work_report_photos(work_report_id);
CREATE INDEX idx_work_report_photos_type ON work_report_photos(photo_type);
CREATE INDEX idx_work_report_photos_org ON work_report_photos(organization_id);

-- ========================================

-- 3. work_report_attachments テーブル（資料・図面管理）
CREATE TABLE work_report_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,

  -- ファイル情報
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL, -- 元のファイル名
  file_type TEXT NOT NULL CHECK (file_type IN ('drawing', 'specification', 'manual', 'other')),
  description TEXT, -- ファイル説明

  -- メタデータ
  file_size BIGINT, -- バイト数
  mime_type TEXT, -- application/pdf, image/jpeg, etc.

  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_attachment_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_attachment_work_report FOREIGN KEY (work_report_id) REFERENCES work_reports(id)
);

-- インデックス
CREATE INDEX idx_work_report_attachments_report ON work_report_attachments(work_report_id);
CREATE INDEX idx_work_report_attachments_type ON work_report_attachments(file_type);
CREATE INDEX idx_work_report_attachments_org ON work_report_attachments(organization_id);

-- ========================================

-- 4. organization_report_settings テーブル（組織ごとの報告書設定）
CREATE TABLE organization_report_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- よく使う項目のON/OFF
  enable_work_location BOOLEAN DEFAULT true,
  enable_progress_rate BOOLEAN DEFAULT true,
  enable_materials_used BOOLEAN DEFAULT true,
  enable_tools_used BOOLEAN DEFAULT true,
  enable_safety_incidents BOOLEAN DEFAULT true,
  enable_quality_issues BOOLEAN DEFAULT false,
  enable_client_contact BOOLEAN DEFAULT true,
  enable_next_tasks BOOLEAN DEFAULT true,

  -- 写真・添付ファイル
  enable_photos BOOLEAN DEFAULT true,
  max_photos INTEGER DEFAULT 10 CHECK (max_photos >= 0),
  enable_attachments BOOLEAN DEFAULT true,
  max_attachments INTEGER DEFAULT 5 CHECK (max_attachments >= 0),
  max_file_size_mb INTEGER DEFAULT 10 CHECK (max_file_size_mb > 0),

  -- 承認フロー
  require_approval BOOLEAN DEFAULT false,
  approval_required_roles TEXT[] DEFAULT ARRAY['leader', 'admin'], -- 承認可能なロール

  -- カスタムフィールド定義
  custom_field_definitions JSONB DEFAULT '[]',
  -- [{ name, type, options, required, unit }]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_settings_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- インデックス
CREATE INDEX idx_org_report_settings_org ON organization_report_settings(organization_id);

-- 更新日時自動更新トリガー
CREATE TRIGGER update_org_report_settings_updated_at
  BEFORE UPDATE ON organization_report_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- RLS (Row Level Security) ポリシー
-- ========================================

-- work_reports のRLS有効化
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;

-- 自組織のデータのみ閲覧可能
CREATE POLICY "Users can view own organization work reports"
ON work_reports FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 自組織のデータのみ作成可能
CREATE POLICY "Users can create own organization work reports"
ON work_reports FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 作成者本人または管理者のみ編集可能（draft状態のみ）
CREATE POLICY "Users can update own draft reports or admins can update all"
ON work_reports FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
  status = 'draft' AND
  (created_by = auth.uid() OR
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'leader')))
);

-- 作成者本人または管理者のみ削除可能
CREATE POLICY "Users can delete own reports or admins can delete all"
ON work_reports FOR DELETE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
  (created_by = auth.uid() OR
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
);

-- work_report_photos のRLS
ALTER TABLE work_report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization work report photos"
ON work_report_photos FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own organization work report photos"
ON work_report_photos FOR ALL
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- work_report_attachments のRLS
ALTER TABLE work_report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization work report attachments"
ON work_report_attachments FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own organization work report attachments"
ON work_report_attachments FOR ALL
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- organization_report_settings のRLS
ALTER TABLE organization_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization report settings"
ON organization_report_settings FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Only admins can update organization report settings"
ON organization_report_settings FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ========================================
-- コメント追加
-- ========================================

COMMENT ON TABLE work_reports IS '作業報告書（日報）';
COMMENT ON TABLE work_report_photos IS '作業報告書添付写真';
COMMENT ON TABLE work_report_attachments IS '作業報告書添付資料（図面等）';
COMMENT ON TABLE organization_report_settings IS '組織ごとの作業報告書設定';

COMMENT ON COLUMN work_reports.workers IS '作業者情報のJSON配列 [{ user_id, name, work_hours }]';
COMMENT ON COLUMN work_reports.custom_fields IS 'カスタムフィールドのJSON';
COMMENT ON COLUMN organization_report_settings.custom_field_definitions IS 'カスタムフィールド定義のJSON配列';
