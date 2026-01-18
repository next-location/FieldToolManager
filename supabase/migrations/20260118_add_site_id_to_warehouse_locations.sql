-- Add site_id to warehouse_locations table
-- This allows warehouse locations to be associated with specific own locations (sites)
-- NULL site_id means "main company warehouse"

-- Add site_id column
ALTER TABLE warehouse_locations
  ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX idx_warehouse_locations_site
  ON warehouse_locations(site_id) WHERE site_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN warehouse_locations.site_id IS '拠点ID（nullの場合は会社メイン倉庫）';

-- Update unique constraint to include site_id
-- First drop the old constraint
ALTER TABLE warehouse_locations
  DROP CONSTRAINT IF EXISTS warehouse_locations_organization_id_code_key;

-- Add new unique constraint that includes site_id
ALTER TABLE warehouse_locations
  ADD CONSTRAINT warehouse_locations_organization_id_site_id_code_key
  UNIQUE(organization_id, site_id, code);

-- Note: This allows the same code to be used in different sites
-- e.g., "A-1-上" can exist in both main warehouse (site_id=null) and branch warehouse (site_id='...')
