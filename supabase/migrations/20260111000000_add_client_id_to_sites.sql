-- Add client_id column to sites table
ALTER TABLE sites ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sites_client_id ON sites(client_id);

-- Add comment
COMMENT ON COLUMN sites.client_id IS '取引先ID（顧客・元請け企業）';
