-- 営業リード管理テーブル
CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  company_name TEXT NOT NULL,
  company_name_kana TEXT,
  subdomain_candidate TEXT,

  -- ステータス管理
  status TEXT NOT NULL DEFAULT 'appointment' CHECK (
    status IN (
      'appointment',      -- アポイント
      'prospect',         -- 見込み客
      'proposal',         -- 提案中
      'negotiation',      -- 商談中
      'contracting',      -- 契約中
      'contracted',       -- 契約済み
      'do_not_contact'    -- アポ禁止
    )
  ),

  -- 連絡先情報
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  postal_code TEXT,
  address TEXT,

  -- 営業情報
  industry TEXT,
  employee_count INTEGER,
  estimated_budget DECIMAL(15, 2),
  estimated_plan TEXT CHECK (
    estimated_plan IS NULL OR estimated_plan IN ('basic', 'premium', 'enterprise')
  ),

  -- アポイント情報
  next_appointment_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,

  -- 提案内容
  proposal_details TEXT,
  special_requirements TEXT,

  -- メモ・備考
  notes TEXT,

  -- 担当者（スーパー管理者）
  assigned_to TEXT,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- 重複チェック用制約（会社名と住所の組み合わせ）
  UNIQUE(company_name, address)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_sales_leads_status ON sales_leads(status);
CREATE INDEX IF NOT EXISTS idx_sales_leads_organization ON sales_leads(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_leads_next_appointment ON sales_leads(next_appointment_date);
CREATE INDEX IF NOT EXISTS idx_sales_leads_company_name ON sales_leads(company_name);
CREATE INDEX IF NOT EXISTS idx_sales_leads_created_at ON sales_leads(created_at DESC);

-- updated_at自動更新トリガー
CREATE TRIGGER update_sales_leads_updated_at
  BEFORE UPDATE ON sales_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE sales_leads IS '営業リード管理テーブル';
COMMENT ON COLUMN sales_leads.status IS 'ステータス: appointment(アポイント), prospect(見込み客), proposal(提案中), negotiation(商談中), contracting(契約中), contracted(契約済み), do_not_contact(アポ禁止)';
COMMENT ON COLUMN sales_leads.organization_id IS '契約済みの場合、紐づく組織ID';
