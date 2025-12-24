-- Rollback: Remove contact information columns from organizations table
-- Migration: 20251224000001_add_contact_info_to_organizations

-- Drop indexes
DROP INDEX IF EXISTS idx_organizations_phone;
DROP INDEX IF EXISTS idx_organizations_email;

-- Drop columns
ALTER TABLE organizations
DROP COLUMN IF EXISTS representative_name,
DROP COLUMN IF EXISTS postal_code,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS fax,
DROP COLUMN IF EXISTS email;
