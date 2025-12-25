-- 組織テーブルに営業管理用カラムを追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS sales_status TEXT DEFAULT 'not_contacted',
ADD COLUMN IF NOT EXISTS next_appointment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS expected_contract_amount DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE;

-- sales_statusの制約を追加
ALTER TABLE organizations
ADD CONSTRAINT organizations_sales_status_check
CHECK (sales_status IN (
  'not_contacted',      -- 未接触
  'appointment',        -- アポイント済み
  'prospect',           -- 見込み客
  'proposal',           -- 提案中
  'negotiation',        -- 商談中
  'contracting',        -- 契約手続き中
  'contracted',         -- 契約済み
  'cancelled',          -- キャンセル
  'lost',               -- 失注
  'do_not_contact'      -- 連絡不要
));

-- コメント追加
COMMENT ON COLUMN organizations.sales_status IS '営業ステータス';
COMMENT ON COLUMN organizations.next_appointment_date IS '次回アポイント日時';
COMMENT ON COLUMN organizations.priority IS '優先度（0-10、高いほど優先）';
COMMENT ON COLUMN organizations.expected_contract_amount IS '予想契約金額';
COMMENT ON COLUMN organizations.last_contact_date IS '最終連絡日時';

-- インデックス追加（営業管理でよく使うクエリ用）
CREATE INDEX IF NOT EXISTS idx_organizations_sales_status ON organizations(sales_status) WHERE sales_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_next_appointment ON organizations(next_appointment_date) WHERE next_appointment_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_priority ON organizations(priority DESC) WHERE priority > 0;
