-- Add 'draft' status to contracts table
-- This allows contracts to be created without immediately activating them

-- Drop existing constraint if it exists
ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_status_check;

-- Add new constraint with 'draft' status
ALTER TABLE contracts ADD CONSTRAINT contracts_status_check
  CHECK (status IN ('draft', 'active', 'pending', 'suspended', 'cancelled', 'expired'));

-- Add comment
COMMENT ON COLUMN contracts.status IS 'Contract status: draft (not yet activated), active, pending, suspended, cancelled, expired';
