-- 帳票管理機能用テーブル作成マイグレーション
-- ==========================================
-- 注意: 既存のinvoicesテーブル（SaaS契約用）と区別するため
-- 帳票管理用のテーブルには別名を使用

-- 1. 工事マスタテーブル
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_code TEXT NOT NULL,
  project_name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),

  -- 工期
  start_date DATE,
  end_date DATE,

  -- 金額
  contract_amount DECIMAL(12, 2),
  budget_amount DECIMAL(12, 2),

  -- ステータス
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'completed', 'cancelled')),

  -- 担当者
  project_manager_id UUID REFERENCES users(id),

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(organization_id, project_code)
);

-- 2. 見積書テーブル
CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  estimate_number TEXT NOT NULL,
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),

  -- 見積情報
  estimate_date DATE NOT NULL,
  valid_until DATE,
  title TEXT NOT NULL,

  -- 金額
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,

  -- ステータス
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),

  -- 担当者
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),

  -- メタデータ
  notes TEXT,
  internal_notes TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(organization_id, estimate_number)
);

-- 3. 見積明細テーブル
CREATE TABLE IF NOT EXISTS estimate_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_id UUID NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,

  -- 明細情報
  display_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('material', 'labor', 'subcontract', 'expense', 'other')),
  item_code TEXT,
  item_name TEXT NOT NULL,
  description TEXT,

  -- 数量・単価
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,

  -- 税率
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.0,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 請求書テーブル（billing_invoicesとして作成）
CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  estimate_id UUID REFERENCES estimates(id),
  client_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),

  -- 請求情報
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  title TEXT NOT NULL,

  -- 金額
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,
  paid_amount DECIMAL(12, 2) DEFAULT 0,

  -- インボイス対応
  is_qualified_invoice BOOLEAN DEFAULT false,
  invoice_registration_number TEXT,

  -- ステータス
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled')),

  -- 承認
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- 送付記録
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_method TEXT,

  -- メタデータ
  notes TEXT,
  internal_notes TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(organization_id, invoice_number)
);

-- 5. 請求明細テーブル
CREATE TABLE IF NOT EXISTS billing_invoice_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
  -- work_report_id UUID REFERENCES work_reports(id), -- 作業報告書テーブル作成後に追加

  -- 明細情報
  display_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('material', 'labor', 'subcontract', 'expense', 'other')),
  item_code TEXT,
  item_name TEXT NOT NULL,
  description TEXT,

  -- 数量・単価
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,

  -- 税率
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.0,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 発注書テーブル
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  supplier_id UUID REFERENCES clients(id),
  project_id UUID REFERENCES projects(id),

  -- 発注情報
  order_date DATE NOT NULL,
  delivery_date DATE,
  delivery_location TEXT,

  -- 金額
  subtotal DECIMAL(12, 2) NOT NULL,
  tax_amount DECIMAL(12, 2) NOT NULL,
  total_amount DECIMAL(12, 2) NOT NULL,

  -- ステータス
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ordered', 'partially_received', 'received', 'cancelled')),

  -- 承認
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,

  -- メタデータ
  notes TEXT,
  internal_notes TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,

  UNIQUE(organization_id, order_number)
);

-- 7. 発注明細テーブル
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,

  -- 明細情報
  display_order INTEGER NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('material', 'labor', 'subcontract', 'expense', 'other')),
  item_code TEXT,
  item_name TEXT NOT NULL,
  description TEXT,

  -- 数量・単価
  quantity DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  unit_price DECIMAL(12, 2) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,

  -- 税率
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10.0,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. 入出金記録テーブル
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 入出金タイプ
  payment_type TEXT NOT NULL CHECK (payment_type IN ('receipt', 'payment')),

  -- 関連帳票
  invoice_id UUID REFERENCES billing_invoices(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),

  -- 支払情報
  payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('bank_transfer', 'cash', 'check', 'credit_card', 'other')),

  -- 銀行情報
  bank_name TEXT,
  bank_account_number TEXT,
  reference_number TEXT,

  -- 記録者
  recorded_by UUID REFERENCES users(id),

  -- メタデータ
  notes TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 組織テーブルの拡張（インボイス対応）
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS tax_registration_number TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS is_qualified_invoice_issuer BOOLEAN DEFAULT false;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS company_seal_url TEXT;

-- コメント追加
COMMENT ON COLUMN organizations.tax_registration_number IS '適格請求書発行事業者登録番号（T + 13桁）';
COMMENT ON COLUMN organizations.is_qualified_invoice_issuer IS '適格請求書発行事業者かどうか';
COMMENT ON COLUMN organizations.company_seal_url IS '会社印の画像URL（請求書等に使用）';

-- インデックス作成
-- 工事
CREATE INDEX IF NOT EXISTS idx_projects_org_status ON projects(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);

-- 見積書
CREATE INDEX IF NOT EXISTS idx_estimates_org_status ON estimates(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_estimates_client ON estimates(client_id);
CREATE INDEX IF NOT EXISTS idx_estimates_project ON estimates(project_id);
CREATE INDEX IF NOT EXISTS idx_estimates_date ON estimates(estimate_date DESC);

-- 請求書
CREATE INDEX IF NOT EXISTS idx_billing_invoices_org_status ON billing_invoices(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_client ON billing_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_project ON billing_invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due_date ON billing_invoices(due_date);

-- 発注書
CREATE INDEX IF NOT EXISTS idx_purchase_orders_org_status ON purchase_orders(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_project ON purchase_orders(project_id);

-- 入出金
CREATE INDEX IF NOT EXISTS idx_payments_org_type ON payments(organization_id, payment_type);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC);

-- RLS (Row Level Security) ポリシー
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- プロジェクトのRLSポリシー
CREATE POLICY "Users can view projects in their organization" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin can insert projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = projects.organization_id
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "Admin can update projects" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = projects.organization_id
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 見積書のRLSポリシー
CREATE POLICY "Users can view estimates in their organization" ON estimates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Leader can insert estimates" ON estimates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = estimates.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'leader')
    )
  );

-- 請求書のRLSポリシー
CREATE POLICY "Users can view billing_invoices in their organization" ON billing_invoices
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Leader can insert billing_invoices" ON billing_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = billing_invoices.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'leader')
    )
  );

-- 明細テーブルのRLSポリシー（親テーブルを参照）
CREATE POLICY "Users can view estimate items" ON estimate_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND e.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view invoice items" ON billing_invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- 発注書のRLSポリシー
CREATE POLICY "Users can view purchase orders" ON purchase_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 入出金のRLSポリシー
CREATE POLICY "Admin can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = payments.organization_id
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "Admin can insert payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = payments.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );