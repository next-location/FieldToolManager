-- Drop foreign key constraint on contracts.super_admin_created_by
-- This allows flexibility in tracking super admin creators without strict referential integrity
ALTER TABLE contracts
DROP CONSTRAINT IF EXISTS contracts_super_admin_created_by_fkey;

COMMENT ON COLUMN contracts.super_admin_created_by IS 'UUID of super admin who created the contract (for audit log, no FK constraint)';
