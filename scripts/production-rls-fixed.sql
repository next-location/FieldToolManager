-- =========================================
-- Production RLS Policies - Fixed Version
-- Date: 2025-12-22
-- Purpose: Apply RLS policies based on actual production table structure
-- =========================================

-- =========================================
-- Step 1: Create Helper Functions
-- =========================================

CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT organization_id FROM users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins
    WHERE id = auth.uid() AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_organization_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- Step 2: Users Table Policies
-- =========================================

DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_select_org" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_admin" ON users;
DROP POLICY IF EXISTS "users_delete_admin" ON users;

CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "users_select_org" ON users
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_admin" ON users
  FOR INSERT
  WITH CHECK (
    is_organization_admin() AND
    organization_id = get_user_organization_id()
  );

CREATE POLICY "users_delete_admin" ON users
  FOR DELETE
  USING (
    is_organization_admin() AND
    organization_id = get_user_organization_id()
  );

-- =========================================
-- Step 3: Organizations Table Policies
-- =========================================

DROP POLICY IF EXISTS "organizations_select_super_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_insert_super_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_update_super_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_delete_super_admin" ON organizations;
DROP POLICY IF EXISTS "organizations_select_own" ON organizations;

CREATE POLICY "organizations_select_super_admin" ON organizations
  FOR SELECT
  USING (is_super_admin());

CREATE POLICY "organizations_insert_super_admin" ON organizations
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "organizations_update_super_admin" ON organizations
  FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "organizations_delete_super_admin" ON organizations
  FOR DELETE
  USING (is_super_admin());

CREATE POLICY "organizations_select_own" ON organizations
  FOR SELECT
  USING (id = get_user_organization_id());

-- =========================================
-- Step 4: Contracts Table Policies
-- =========================================

DROP POLICY IF EXISTS "contracts_select_super_admin" ON contracts;
DROP POLICY IF EXISTS "contracts_insert_super_admin" ON contracts;
DROP POLICY IF EXISTS "contracts_update_super_admin" ON contracts;
DROP POLICY IF EXISTS "contracts_select_own_org" ON contracts;

CREATE POLICY "contracts_select_super_admin" ON contracts
  FOR SELECT
  USING (is_super_admin());

CREATE POLICY "contracts_insert_super_admin" ON contracts
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "contracts_update_super_admin" ON contracts
  FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "contracts_select_own_org" ON contracts
  FOR SELECT
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 5: Tool Management Tables Policies
-- =========================================

DROP POLICY IF EXISTS "tool_categories_select" ON tool_categories;
DROP POLICY IF EXISTS "tool_categories_insert" ON tool_categories;
DROP POLICY IF EXISTS "tool_categories_update" ON tool_categories;
DROP POLICY IF EXISTS "tool_categories_delete" ON tool_categories;

CREATE POLICY "tool_categories_select" ON tool_categories
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "tool_categories_insert" ON tool_categories
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "tool_categories_update" ON tool_categories
  FOR UPDATE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "tool_categories_delete" ON tool_categories
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

DROP POLICY IF EXISTS "tool_sets_select" ON tool_sets;
DROP POLICY IF EXISTS "tool_sets_insert" ON tool_sets;
DROP POLICY IF EXISTS "tool_sets_update" ON tool_sets;
DROP POLICY IF EXISTS "tool_sets_delete" ON tool_sets;

CREATE POLICY "tool_sets_select" ON tool_sets
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "tool_sets_insert" ON tool_sets
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "tool_sets_update" ON tool_sets
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "tool_sets_delete" ON tool_sets
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

DROP POLICY IF EXISTS "tool_items_select" ON tool_items;
DROP POLICY IF EXISTS "tool_items_insert" ON tool_items;
DROP POLICY IF EXISTS "tool_items_update" ON tool_items;
DROP POLICY IF EXISTS "tool_items_delete" ON tool_items;

CREATE POLICY "tool_items_select" ON tool_items
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "tool_items_insert" ON tool_items
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "tool_items_update" ON tool_items
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "tool_items_delete" ON tool_items
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

DROP POLICY IF EXISTS "tool_movements_select" ON tool_movements;
DROP POLICY IF EXISTS "tool_movements_insert" ON tool_movements;

CREATE POLICY "tool_movements_select" ON tool_movements
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "tool_movements_insert" ON tool_movements
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "sites_select" ON sites;
DROP POLICY IF EXISTS "sites_insert" ON sites;
DROP POLICY IF EXISTS "sites_update" ON sites;
DROP POLICY IF EXISTS "sites_delete" ON sites;

CREATE POLICY "sites_select" ON sites
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "sites_insert" ON sites
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "sites_update" ON sites
  FOR UPDATE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "sites_delete" ON sites
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 6: Attendance Tables Policies
-- =========================================

DROP POLICY IF EXISTS "attendance_records_select" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_insert" ON attendance_records;
DROP POLICY IF EXISTS "attendance_records_update" ON attendance_records;

CREATE POLICY "attendance_records_select" ON attendance_records
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "attendance_records_insert" ON attendance_records
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND user_id = auth.uid());

CREATE POLICY "attendance_records_update" ON attendance_records
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

DROP POLICY IF EXISTS "attendance_settings_select" ON attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_insert" ON attendance_settings;
DROP POLICY IF EXISTS "attendance_settings_update" ON attendance_settings;

CREATE POLICY "attendance_settings_select" ON attendance_settings
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "attendance_settings_insert" ON attendance_settings
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND is_organization_admin());

CREATE POLICY "attendance_settings_update" ON attendance_settings
  FOR UPDATE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 7: Work Reports Tables Policies
-- =========================================

DROP POLICY IF EXISTS "work_reports_select" ON work_reports;
DROP POLICY IF EXISTS "work_reports_insert" ON work_reports;
DROP POLICY IF EXISTS "work_reports_update" ON work_reports;
DROP POLICY IF EXISTS "work_reports_delete" ON work_reports;

CREATE POLICY "work_reports_select" ON work_reports
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "work_reports_insert" ON work_reports
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id() AND created_by = auth.uid());

CREATE POLICY "work_reports_update" ON work_reports
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "work_reports_delete" ON work_reports
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND created_by = auth.uid());

-- =========================================
-- Step 8: Estimates Table Policies
-- =========================================

DROP POLICY IF EXISTS "estimates_select" ON estimates;
DROP POLICY IF EXISTS "estimates_insert" ON estimates;
DROP POLICY IF EXISTS "estimates_update" ON estimates;
DROP POLICY IF EXISTS "estimates_delete" ON estimates;

CREATE POLICY "estimates_select" ON estimates
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "estimates_insert" ON estimates
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "estimates_update" ON estimates
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "estimates_delete" ON estimates
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 9: Estimate Items (no organization_id - use parent table)
-- =========================================

DROP POLICY IF EXISTS "estimate_items_select" ON estimate_items;
DROP POLICY IF EXISTS "estimate_items_insert" ON estimate_items;
DROP POLICY IF EXISTS "estimate_items_update" ON estimate_items;
DROP POLICY IF EXISTS "estimate_items_delete" ON estimate_items;

CREATE POLICY "estimate_items_select" ON estimate_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_items.estimate_id
      AND estimates.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "estimate_items_insert" ON estimate_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_items.estimate_id
      AND estimates.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "estimate_items_update" ON estimate_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_items.estimate_id
      AND estimates.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "estimate_items_delete" ON estimate_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM estimates
      WHERE estimates.id = estimate_items.estimate_id
      AND estimates.organization_id = get_user_organization_id()
    )
  );

-- =========================================
-- Step 10: Invoices Table Policies
-- =========================================

DROP POLICY IF EXISTS "invoices_select" ON invoices;
DROP POLICY IF EXISTS "invoices_insert" ON invoices;
DROP POLICY IF EXISTS "invoices_update" ON invoices;
DROP POLICY IF EXISTS "invoices_delete" ON invoices;

CREATE POLICY "invoices_select" ON invoices
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 11: Invoice Items (no organization_id - use parent table)
-- =========================================

DROP POLICY IF EXISTS "invoice_items_select" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_insert" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_update" ON invoice_items;
DROP POLICY IF EXISTS "invoice_items_delete" ON invoice_items;

CREATE POLICY "invoice_items_select" ON invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "invoice_items_insert" ON invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "invoice_items_update" ON invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "invoice_items_delete" ON invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM invoices
      WHERE invoices.id = invoice_items.invoice_id
      AND invoices.organization_id = get_user_organization_id()
    )
  );

-- =========================================
-- Step 12: Purchase Orders Table Policies
-- =========================================

DROP POLICY IF EXISTS "purchase_orders_select" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_insert" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_update" ON purchase_orders;
DROP POLICY IF EXISTS "purchase_orders_delete" ON purchase_orders;

CREATE POLICY "purchase_orders_select" ON purchase_orders
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "purchase_orders_insert" ON purchase_orders
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "purchase_orders_update" ON purchase_orders
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "purchase_orders_delete" ON purchase_orders
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 13: Purchase Order Items (no organization_id - use parent table)
-- =========================================

DROP POLICY IF EXISTS "purchase_order_items_select" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_insert" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_update" ON purchase_order_items;
DROP POLICY IF EXISTS "purchase_order_items_delete" ON purchase_order_items;

CREATE POLICY "purchase_order_items_select" ON purchase_order_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "purchase_order_items_insert" ON purchase_order_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "purchase_order_items_update" ON purchase_order_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_organization_id()
    )
  );

CREATE POLICY "purchase_order_items_delete" ON purchase_order_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM purchase_orders
      WHERE purchase_orders.id = purchase_order_items.purchase_order_id
      AND purchase_orders.organization_id = get_user_organization_id()
    )
  );

-- =========================================
-- Step 14: Clients Table Policies
-- =========================================

DROP POLICY IF EXISTS "clients_select" ON clients;
DROP POLICY IF EXISTS "clients_insert" ON clients;
DROP POLICY IF EXISTS "clients_update" ON clients;
DROP POLICY IF EXISTS "clients_delete" ON clients;

CREATE POLICY "clients_select" ON clients
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "clients_insert" ON clients
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "clients_update" ON clients
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "clients_delete" ON clients
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 15: Consumables Tables Policies
-- =========================================

DROP POLICY IF EXISTS "consumables_select" ON consumables;
DROP POLICY IF EXISTS "consumables_insert" ON consumables;
DROP POLICY IF EXISTS "consumables_update" ON consumables;
DROP POLICY IF EXISTS "consumables_delete" ON consumables;

CREATE POLICY "consumables_select" ON consumables
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "consumables_insert" ON consumables
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "consumables_update" ON consumables
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "consumables_delete" ON consumables
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

DROP POLICY IF EXISTS "consumable_orders_select" ON consumable_orders;
DROP POLICY IF EXISTS "consumable_orders_insert" ON consumable_orders;
DROP POLICY IF EXISTS "consumable_orders_update" ON consumable_orders;

CREATE POLICY "consumable_orders_select" ON consumable_orders
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "consumable_orders_insert" ON consumable_orders
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "consumable_orders_update" ON consumable_orders
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

-- =========================================
-- Step 16: Heavy Equipment Table Policies
-- =========================================

DROP POLICY IF EXISTS "heavy_equipment_select" ON heavy_equipment;
DROP POLICY IF EXISTS "heavy_equipment_insert" ON heavy_equipment;
DROP POLICY IF EXISTS "heavy_equipment_update" ON heavy_equipment;
DROP POLICY IF EXISTS "heavy_equipment_delete" ON heavy_equipment;

CREATE POLICY "heavy_equipment_select" ON heavy_equipment
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "heavy_equipment_insert" ON heavy_equipment
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "heavy_equipment_update" ON heavy_equipment
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "heavy_equipment_delete" ON heavy_equipment
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 17: Warehouse Locations Table Policies
-- =========================================

DROP POLICY IF EXISTS "warehouse_locations_select" ON warehouse_locations;
DROP POLICY IF EXISTS "warehouse_locations_insert" ON warehouse_locations;
DROP POLICY IF EXISTS "warehouse_locations_update" ON warehouse_locations;
DROP POLICY IF EXISTS "warehouse_locations_delete" ON warehouse_locations;

CREATE POLICY "warehouse_locations_select" ON warehouse_locations
  FOR SELECT
  USING (organization_id = get_user_organization_id());

CREATE POLICY "warehouse_locations_insert" ON warehouse_locations
  FOR INSERT
  WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "warehouse_locations_update" ON warehouse_locations
  FOR UPDATE
  USING (organization_id = get_user_organization_id());

CREATE POLICY "warehouse_locations_delete" ON warehouse_locations
  FOR DELETE
  USING (organization_id = get_user_organization_id() AND is_organization_admin());

-- =========================================
-- Step 18: Super Admin Only Tables
-- =========================================

DROP POLICY IF EXISTS "super_admins_select" ON super_admins;
DROP POLICY IF EXISTS "super_admins_update_own" ON super_admins;

CREATE POLICY "super_admins_select" ON super_admins
  FOR SELECT
  USING (is_super_admin());

CREATE POLICY "super_admins_update_own" ON super_admins
  FOR UPDATE
  USING (id = auth.uid() AND is_super_admin());

DROP POLICY IF EXISTS "tool_manufacturers_select" ON tool_manufacturers;
DROP POLICY IF EXISTS "tool_manufacturers_insert" ON tool_manufacturers;
DROP POLICY IF EXISTS "tool_manufacturers_update" ON tool_manufacturers;

CREATE POLICY "tool_manufacturers_select" ON tool_manufacturers
  FOR SELECT
  USING (true);

CREATE POLICY "tool_manufacturers_insert" ON tool_manufacturers
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "tool_manufacturers_update" ON tool_manufacturers
  FOR UPDATE
  USING (is_super_admin());

DROP POLICY IF EXISTS "tool_master_presets_select" ON tool_master_presets;
DROP POLICY IF EXISTS "tool_master_presets_insert" ON tool_master_presets;
DROP POLICY IF EXISTS "tool_master_presets_update" ON tool_master_presets;
DROP POLICY IF EXISTS "tool_master_presets_delete" ON tool_master_presets;

CREATE POLICY "tool_master_presets_select" ON tool_master_presets
  FOR SELECT
  USING (true);

CREATE POLICY "tool_master_presets_insert" ON tool_master_presets
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "tool_master_presets_update" ON tool_master_presets
  FOR UPDATE
  USING (is_super_admin());

CREATE POLICY "tool_master_presets_delete" ON tool_master_presets
  FOR DELETE
  USING (is_super_admin());

DROP POLICY IF EXISTS "billing_invoices_select" ON billing_invoices;
DROP POLICY IF EXISTS "billing_invoices_insert" ON billing_invoices;
DROP POLICY IF EXISTS "billing_invoices_update" ON billing_invoices;

CREATE POLICY "billing_invoices_select" ON billing_invoices
  FOR SELECT
  USING (is_super_admin());

CREATE POLICY "billing_invoices_insert" ON billing_invoices
  FOR INSERT
  WITH CHECK (is_super_admin());

CREATE POLICY "billing_invoices_update" ON billing_invoices
  FOR UPDATE
  USING (is_super_admin());

-- =========================================
-- Completion Message
-- =========================================

DO $$
BEGIN
  RAISE NOTICE '✅ RLS Policies applied successfully';
  RAISE NOTICE '🔐 Row Level Security is now fully configured';
END $$;
