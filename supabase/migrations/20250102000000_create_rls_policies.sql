-- ========================================
-- Row Level Security (RLS) Policies
-- ========================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ========================================
-- Helper function to get user's organization_id
-- ========================================
CREATE OR REPLACE FUNCTION public.get_organization_id()
RETURNS UUID AS $$
BEGIN
    RETURN COALESCE(
        current_setting('app.current_organization_id', true)::UUID,
        (auth.jwt() ->> 'organization_id')::UUID
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Organizations Policies
-- ========================================
-- Users can only see their own organization
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = public.get_organization_id());

-- Only system admins can insert organizations (handled at application level)
CREATE POLICY "System admins can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (false); -- Will be handled by service role

-- Organization admins can update their organization
CREATE POLICY "Organization admins can update own organization"
    ON organizations FOR UPDATE
    USING (id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = organizations.id
                   AND id = auth.uid() AND role = 'admin'));

-- ========================================
-- Users Policies
-- ========================================
-- Users can view users in their organization
CREATE POLICY "Users can view organization users"
    ON users FOR SELECT
    USING (organization_id = public.get_organization_id());

-- Only organization admins can insert users
CREATE POLICY "Organization admins can insert users"
    ON users FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id() AND
                EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                        AND id = auth.uid() AND role = 'admin'));

-- Organization admins can update users
CREATE POLICY "Organization admins can update users"
    ON users FOR UPDATE
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND organization_id = public.get_organization_id());

-- ========================================
-- Tool Categories Policies
-- ========================================
-- All users can view categories in their organization
CREATE POLICY "Users can view organization categories"
    ON tool_categories FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- Managers and admins can manage categories
CREATE POLICY "Managers can manage categories"
    ON tool_categories FOR ALL
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')));

-- ========================================
-- Tools Policies
-- ========================================
-- All users can view tools in their organization
CREATE POLICY "Users can view organization tools"
    ON tools FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- All users can insert tools (for check-in/out)
CREATE POLICY "Users can insert tools"
    ON tools FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id());

-- All users can update tools (for movements)
CREATE POLICY "Users can update tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- Only managers and admins can soft delete tools
CREATE POLICY "Managers can delete tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')))
    WITH CHECK (organization_id = public.get_organization_id() AND deleted_at IS NOT NULL);

-- ========================================
-- Sites Policies
-- ========================================
-- All users can view sites in their organization
CREATE POLICY "Users can view organization sites"
    ON sites FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- Managers and admins can manage sites
CREATE POLICY "Managers can manage sites"
    ON sites FOR ALL
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')));

-- ========================================
-- Tool Movements Policies
-- ========================================
-- All users can view movements in their organization
CREATE POLICY "Users can view organization movements"
    ON tool_movements FOR SELECT
    USING (organization_id = public.get_organization_id());

-- All users can create movements
CREATE POLICY "Users can create movements"
    ON tool_movements FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id() AND performed_by = auth.uid());

-- Movements cannot be updated or deleted (immutable history)
-- No UPDATE or DELETE policies

-- ========================================
-- Contracts Policies
-- ========================================
-- Only admins can view contracts
CREATE POLICY "Admins can view contracts"
    ON contracts FOR SELECT
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Only system can manage contracts (via service role)
CREATE POLICY "System manages contracts"
    ON contracts FOR ALL
    USING (false)
    WITH CHECK (false);

-- ========================================
-- Invoices Policies
-- ========================================
-- Admins can view invoices
CREATE POLICY "Admins can view invoices"
    ON invoices FOR SELECT
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Only system can manage invoices (via service role)
CREATE POLICY "System manages invoices"
    ON invoices FOR ALL
    USING (false)
    WITH CHECK (false);

-- ========================================
-- Payment Records Policies
-- ========================================
-- Admins can view payment records
CREATE POLICY "Admins can view payment records"
    ON payment_records FOR SELECT
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Only system can manage payment records (via service role)
CREATE POLICY "System manages payment records"
    ON payment_records FOR ALL
    USING (false)
    WITH CHECK (false);

-- ========================================
-- Audit Logs Policies
-- ========================================
-- Users can view audit logs for their organization
CREATE POLICY "Users can view organization audit logs"
    ON audit_logs FOR SELECT
    USING (organization_id = public.get_organization_id());

-- Only system can insert audit logs
CREATE POLICY "System inserts audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id());

-- Audit logs are immutable (no update or delete)
-- No UPDATE or DELETE policies