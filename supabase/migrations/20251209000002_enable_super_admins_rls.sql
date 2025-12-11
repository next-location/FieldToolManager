-- Enable RLS on super_admins table for security
-- This prevents unauthorized access to super admin data via anon/authenticated roles
-- Only Service Role Key can access this table

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: Deny all access to anon and authenticated users
-- Service Role Key bypasses RLS, so it can still access the table
CREATE POLICY "super_admins_no_access"
ON super_admins
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);

-- Enable RLS on super_admin_logs table
ALTER TABLE super_admin_logs ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: Deny all access to anon and authenticated users
CREATE POLICY "super_admin_logs_no_access"
ON super_admin_logs
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);
