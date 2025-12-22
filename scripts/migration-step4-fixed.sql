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

-- RLS Policies for organizations (allow service role to bypass RLS)
CREATE POLICY "Service role can manage all organizations"
  ON organizations FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view organizations"
  ON organizations FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for users
CREATE POLICY "Service role can manage all users"
  ON users FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for super_admins
CREATE POLICY "Service role can manage super admins"
  ON super_admins FOR ALL
  TO service_role
  USING (true);

-- RLS Policies for contracts
CREATE POLICY "Service role can manage all contracts"
  ON contracts FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view contracts"
  ON contracts FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tool_categories
CREATE POLICY "Service role can manage tool categories"
  ON tool_categories FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view tool categories"
  ON tool_categories FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tool_manufacturers
CREATE POLICY "Service role can manage manufacturers"
  ON tool_manufacturers FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Anyone can view manufacturers"
  ON tool_manufacturers FOR SELECT
  USING (true);

-- RLS Policies for sites
CREATE POLICY "Service role can manage sites"
  ON sites FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view sites"
  ON sites FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tool_sets
CREATE POLICY "Service role can manage tool sets"
  ON tool_sets FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view tool sets"
  ON tool_sets FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tool_items
CREATE POLICY "Service role can manage tool items"
  ON tool_items FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view tool items"
  ON tool_items FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tool_movements
CREATE POLICY "Service role can manage tool movements"
  ON tool_movements FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view tool movements"
  ON tool_movements FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for warehouse_locations
CREATE POLICY "Service role can manage warehouse locations"
  ON warehouse_locations FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view warehouse locations"
  ON warehouse_locations FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for consumables
CREATE POLICY "Service role can manage consumables"
  ON consumables FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view consumables"
  ON consumables FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for consumable_orders
CREATE POLICY "Service role can manage consumable orders"
  ON consumable_orders FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view consumable orders"
  ON consumable_orders FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for heavy_equipment
CREATE POLICY "Service role can manage heavy equipment"
  ON heavy_equipment FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view heavy equipment"
  ON heavy_equipment FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for tool_master_presets
CREATE POLICY "Service role can manage tool master presets"
  ON tool_master_presets FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Anyone can view tool master presets"
  ON tool_master_presets FOR SELECT
  USING (true);

-- RLS Policies for clients
CREATE POLICY "Service role can manage clients"
  ON clients FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for work_reports
CREATE POLICY "Service role can manage work reports"
  ON work_reports FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view work reports"
  ON work_reports FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for attendance_records
CREATE POLICY "Service role can manage attendance records"
  ON attendance_records FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view attendance records"
  ON attendance_records FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for attendance_settings
CREATE POLICY "Service role can manage attendance settings"
  ON attendance_settings FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view attendance settings"
  ON attendance_settings FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for estimates
CREATE POLICY "Service role can manage estimates"
  ON estimates FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view estimates"
  ON estimates FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for estimate_items
CREATE POLICY "Service role can manage estimate items"
  ON estimate_items FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view estimate items"
  ON estimate_items FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for invoices
CREATE POLICY "Service role can manage invoices"
  ON invoices FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for invoice_items
CREATE POLICY "Service role can manage invoice items"
  ON invoice_items FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view invoice items"
  ON invoice_items FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for purchase_orders
CREATE POLICY "Service role can manage purchase orders"
  ON purchase_orders FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view purchase orders"
  ON purchase_orders FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for purchase_order_items
CREATE POLICY "Service role can manage purchase order items"
  ON purchase_order_items FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view purchase order items"
  ON purchase_order_items FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for billing_invoices
CREATE POLICY "Service role can manage billing invoices"
  ON billing_invoices FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Authenticated users can view billing invoices"
  ON billing_invoices FOR SELECT
  TO authenticated
  USING (true);

-- Success message
SELECT 'Step 4: RLS policies created successfully' as status;