-- ========================================
-- STEP 4: Row Level Security (RLS) ポリシー
-- ========================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumables ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumable_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE heavy_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_master_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's organization_id
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'organization_id')::UUID;
$$ LANGUAGE SQL STABLE;

-- Helper function to check if user is super admin
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'is_super_admin')::BOOLEAN = true;
$$ LANGUAGE SQL STABLE;

-- RLS Policies for organizations
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Super admins can manage all organizations"
  ON organizations FOR ALL
  USING (auth.is_super_admin());

-- RLS Policies for users
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Admins can manage users in their organization"
  ON users FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    AND (
      (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager')
      OR auth.is_super_admin()
    )
  );

-- RLS Policies for super_admins (only super admins can access)
CREATE POLICY "Only super admins can access super_admins"
  ON super_admins FOR ALL
  USING (auth.is_super_admin());

-- RLS Policies for contracts
CREATE POLICY "Users can view their organization's contracts"
  ON contracts FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Super admins can manage all contracts"
  ON contracts FOR ALL
  USING (auth.is_super_admin());

-- RLS Policies for tool_categories
CREATE POLICY "Users can view tool categories in their organization"
  ON tool_categories FOR SELECT
  USING (organization_id = auth.user_organization_id() OR is_common = true OR auth.is_super_admin());

CREATE POLICY "Admins can manage tool categories in their organization"
  ON tool_categories FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    AND (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager')
    OR auth.is_super_admin()
  );

-- RLS Policies for sites
CREATE POLICY "Users can view sites in their organization"
  ON sites FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Admins can manage sites in their organization"
  ON sites FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    AND (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager', 'leader')
    OR auth.is_super_admin()
  );

-- RLS Policies for tool_sets
CREATE POLICY "Users can view tool sets in their organization"
  ON tool_sets FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Users can manage tool sets in their organization"
  ON tool_sets FOR ALL
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

-- RLS Policies for tool_items
CREATE POLICY "Users can view tool items in their organization"
  ON tool_items FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Users can manage tool items in their organization"
  ON tool_items FOR ALL
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

-- RLS Policies for tool_movements
CREATE POLICY "Users can view tool movements in their organization"
  ON tool_movements FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Users can create tool movements in their organization"
  ON tool_movements FOR INSERT
  WITH CHECK (organization_id = auth.user_organization_id() OR auth.is_super_admin());

-- RLS Policies for clients
CREATE POLICY "Users can view clients in their organization"
  ON clients FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Admins can manage clients in their organization"
  ON clients FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    AND (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager')
    OR auth.is_super_admin()
  );

-- RLS Policies for work_reports
CREATE POLICY "Users can view work reports in their organization"
  ON work_reports FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Users can manage their own work reports"
  ON work_reports FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    OR auth.is_super_admin()
  );

-- RLS Policies for attendance_records
CREATE POLICY "Users can view their own attendance records"
  ON attendance_records FOR SELECT
  USING (
    user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::UUID
    OR (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager')
    OR auth.is_super_admin()
  );

CREATE POLICY "Users can create their own attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (
    user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::UUID
    AND organization_id = auth.user_organization_id()
  );

-- RLS Policies for estimates
CREATE POLICY "Users can view estimates in their organization"
  ON estimates FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Admins can manage estimates"
  ON estimates FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    AND (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager')
    OR auth.is_super_admin()
  );

-- RLS Policies for estimate_items
CREATE POLICY "Users can view estimate items in their organization"
  ON estimate_items FOR SELECT
  USING (
    estimate_id IN (SELECT id FROM estimates WHERE organization_id = auth.user_organization_id())
    OR auth.is_super_admin()
  );

CREATE POLICY "Admins can manage estimate items"
  ON estimate_items FOR ALL
  USING (
    estimate_id IN (SELECT id FROM estimates WHERE organization_id = auth.user_organization_id())
    OR auth.is_super_admin()
  );

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their organization"
  ON invoices FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Admins can manage invoices"
  ON invoices FOR ALL
  USING (
    organization_id = auth.user_organization_id()
    AND (current_setting('request.jwt.claims', true)::json->>'role')::TEXT IN ('admin', 'manager')
    OR auth.is_super_admin()
  );

-- RLS Policies for invoice_items
CREATE POLICY "Users can view invoice items in their organization"
  ON invoice_items FOR SELECT
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE organization_id = auth.user_organization_id())
    OR auth.is_super_admin()
  );

CREATE POLICY "Admins can manage invoice items"
  ON invoice_items FOR ALL
  USING (
    invoice_id IN (SELECT id FROM invoices WHERE organization_id = auth.user_organization_id())
    OR auth.is_super_admin()
  );

-- RLS Policies for billing_invoices
CREATE POLICY "Users can view their organization's billing invoices"
  ON billing_invoices FOR SELECT
  USING (organization_id = auth.user_organization_id() OR auth.is_super_admin());

CREATE POLICY "Super admins can manage all billing invoices"
  ON billing_invoices FOR ALL
  USING (auth.is_super_admin());

-- Allow public access to tool_manufacturers (read-only for system manufacturers)
CREATE POLICY "Anyone can view system manufacturers"
  ON tool_manufacturers FOR SELECT
  USING (is_system = true OR auth.is_super_admin());

CREATE POLICY "Super admins can manage manufacturers"
  ON tool_manufacturers FOR ALL
  USING (auth.is_super_admin());

-- Allow public access to tool_master_presets (read-only)
CREATE POLICY "Anyone can view tool master presets"
  ON tool_master_presets FOR SELECT
  USING (true);

CREATE POLICY "Super admins can manage tool master presets"
  ON tool_master_presets FOR ALL
  USING (auth.is_super_admin());

-- Success message
SELECT 'Step 4: RLS policies created successfully' as status;