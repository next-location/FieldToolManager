-- Add admin information columns to contracts table
-- This stores initial admin account info until contract is completed

-- Add columns for initial admin information
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS admin_name TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS admin_password TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS admin_phone TEXT;

-- Add reference to created user (populated after contract completion)
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS admin_user_id UUID REFERENCES users(id);

-- Add contract completion timestamp
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_completed_at TIMESTAMPTZ;

-- Add comments
COMMENT ON COLUMN contracts.admin_name IS 'Initial admin account name (stored until contract completion)';
COMMENT ON COLUMN contracts.admin_email IS 'Initial admin account email (stored until contract completion)';
COMMENT ON COLUMN contracts.admin_password IS 'Initial admin account password (stored until contract completion, then cleared after account creation)';
COMMENT ON COLUMN contracts.admin_phone IS 'Initial admin account phone (stored until contract completion)';
COMMENT ON COLUMN contracts.admin_user_id IS 'Reference to created user account after contract completion';
COMMENT ON COLUMN contracts.contract_completed_at IS 'Timestamp when contract was completed and admin account was created';
