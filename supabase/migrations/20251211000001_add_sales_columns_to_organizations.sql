-- Add sales-related columns to organizations table
-- This migration eliminates the need for a separate sales_leads table
-- Organizations now have sales status from the moment they are registered

-- Add sales status column with CHECK constraint
ALTER TABLE organizations
ADD COLUMN sales_status TEXT DEFAULT 'not_contacted' CHECK (
  sales_status IN (
    'not_contacted',  -- 未接触
    'appointment',    -- アポ取得
    'prospect',       -- 見込み客
    'proposal',       -- 提案中
    'negotiation',    -- 商談中
    'contracting',    -- 契約手続き中
    'contracted',     -- 契約中
    'cancelled',      -- 契約解除
    'do_not_contact'  -- 連絡不要
  )
);

-- Add last contact date
ALTER TABLE organizations
ADD COLUMN last_contact_date TIMESTAMP WITH TIME ZONE;

-- Add next appointment date
ALTER TABLE organizations
ADD COLUMN next_appointment_date TIMESTAMP WITH TIME ZONE;

-- Add expected contract amount
ALTER TABLE organizations
ADD COLUMN expected_contract_amount INTEGER;

-- Add priority level
ALTER TABLE organizations
ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (
  priority IN ('low', 'medium', 'high')
);

-- Add lead source
ALTER TABLE organizations
ADD COLUMN lead_source TEXT;

-- Add sales notes
ALTER TABLE organizations
ADD COLUMN sales_notes TEXT;

-- Add indexes for query performance
CREATE INDEX idx_organizations_sales_status ON organizations(sales_status);
CREATE INDEX idx_organizations_next_appointment ON organizations(next_appointment_date) WHERE next_appointment_date IS NOT NULL;
CREATE INDEX idx_organizations_priority ON organizations(priority);

-- Add comment for documentation
COMMENT ON COLUMN organizations.sales_status IS '営業ステータス: 組織登録時にnot_contactedとして自動設定される';
COMMENT ON COLUMN organizations.last_contact_date IS '最終接触日';
COMMENT ON COLUMN organizations.next_appointment_date IS '次回アポイント日時';
COMMENT ON COLUMN organizations.expected_contract_amount IS '見込み契約金額（円）';
COMMENT ON COLUMN organizations.priority IS '優先度: low（低）, medium（中）, high（高）';
COMMENT ON COLUMN organizations.lead_source IS 'リードソース（流入元）';
COMMENT ON COLUMN organizations.sales_notes IS '営業メモ';
