-- ========================================
-- 作業報告書 写真管理テーブル（既存テーブルに列追加）
-- ========================================

-- 写真コメント・メタデータ列を追加
ALTER TABLE work_report_photos
ADD COLUMN IF NOT EXISTS caption TEXT,
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS location_name TEXT;

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_work_report_photos_display_order
ON work_report_photos(display_order);

-- コメント
COMMENT ON COLUMN work_report_photos.caption IS '写真コメント（作業内容の説明等）';
COMMENT ON COLUMN work_report_photos.display_order IS '写真の表示順序';
COMMENT ON COLUMN work_report_photos.taken_at IS '撮影日時';
COMMENT ON COLUMN work_report_photos.location_name IS '撮影場所名';

-- ========================================
-- 作業報告書 添付ファイル管理テーブル
-- ========================================

CREATE TABLE IF NOT EXISTS work_report_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- ファイル情報
  storage_path TEXT NOT NULL, -- Supabase Storageのパス
  file_name TEXT NOT NULL, -- オリジナルファイル名
  file_size BIGINT, -- ファイルサイズ（バイト）
  mime_type TEXT, -- MIMEタイプ（application/pdf, image/*, etc.）
  file_type TEXT, -- ファイル種別（図面、仕様書、マニュアル、その他）

  -- 説明・メタデータ
  description TEXT, -- ファイル説明
  display_order INTEGER DEFAULT 0, -- 表示順序

  -- メタデータ
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_work_report_attachments_work_report_id
ON work_report_attachments(work_report_id);

CREATE INDEX IF NOT EXISTS idx_work_report_attachments_organization_id
ON work_report_attachments(organization_id);

CREATE INDEX IF NOT EXISTS idx_work_report_attachments_file_type
ON work_report_attachments(file_type);

-- RLS有効化
ALTER TABLE work_report_attachments ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "Users can view attachments in their organization"
ON work_report_attachments FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert attachments for reports in their organization"
ON work_report_attachments FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  work_report_id IN (
    SELECT id FROM work_reports
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update attachments for reports in their organization"
ON work_report_attachments FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete attachments for reports in their organization"
ON work_report_attachments FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- コメント
COMMENT ON TABLE work_report_attachments IS '作業報告書の添付ファイル管理テーブル';
COMMENT ON COLUMN work_report_attachments.file_type IS 'ファイル種別: 図面、仕様書、マニュアル、その他';
