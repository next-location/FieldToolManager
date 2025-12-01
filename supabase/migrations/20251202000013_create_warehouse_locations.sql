-- Warehouse location management tables
-- Customizable hierarchy structure per organization

-- Warehouse location template table (hierarchy configuration)
CREATE TABLE IF NOT EXISTS warehouse_location_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 5),
  label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id, level)
);

COMMENT ON TABLE warehouse_location_templates IS 'Warehouse hierarchy configuration per organization';
COMMENT ON COLUMN warehouse_location_templates.level IS 'Hierarchy level (1-5)';
COMMENT ON COLUMN warehouse_location_templates.label IS 'Level label (e.g., Area, Shelf, Storage Method, Level)';
COMMENT ON COLUMN warehouse_location_templates.is_active IS 'Active/Inactive flag';

-- Warehouse location master table
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  parent_id UUID REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
  qr_code TEXT UNIQUE,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  UNIQUE(organization_id, code)
);

COMMENT ON TABLE warehouse_locations IS 'Warehouse location master (hierarchical structure)';
COMMENT ON COLUMN warehouse_locations.code IS 'Location code (e.g., A-1-Upper, North-WallMount-3)';
COMMENT ON COLUMN warehouse_locations.display_name IS 'Display name (e.g., Area A Shelf 1 Upper Level)';
COMMENT ON COLUMN warehouse_locations.parent_id IS 'Parent location ID (for hierarchy)';
COMMENT ON COLUMN warehouse_locations.level IS 'Hierarchy level (0=root, 1=first level...)';
COMMENT ON COLUMN warehouse_locations.qr_code IS 'Location QR code (UUID)';
COMMENT ON COLUMN warehouse_locations.description IS 'Supplementary description (e.g., Second shelf from entrance on left)';

-- Add warehouse location column to tool_items
ALTER TABLE tool_items
  ADD COLUMN IF NOT EXISTS warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL;

COMMENT ON COLUMN tool_items.warehouse_location_id IS 'Warehouse location (only valid when current_location=warehouse)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_warehouse_location_templates_org
  ON warehouse_location_templates(organization_id);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_org
  ON warehouse_locations(organization_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_parent
  ON warehouse_locations(parent_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_qr
  ON warehouse_locations(qr_code) WHERE qr_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_code
  ON warehouse_locations(organization_id, code);

CREATE INDEX IF NOT EXISTS idx_tool_items_warehouse_location
  ON tool_items(warehouse_location_id) WHERE warehouse_location_id IS NOT NULL;

-- Enable RLS
ALTER TABLE warehouse_location_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_locations ENABLE ROW LEVEL SECURITY;

-- RLS policies for warehouse_location_templates
CREATE POLICY "Users can view their organization's location templates"
  ON warehouse_location_templates FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage location templates"
  ON warehouse_location_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- RLS policies for warehouse_locations
CREATE POLICY "Users can view their organization's warehouse locations"
  ON warehouse_locations FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can manage warehouse locations"
  ON warehouse_locations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_warehouse_location_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_location_templates_updated_at
  BEFORE UPDATE ON warehouse_location_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_location_template_updated_at();

CREATE OR REPLACE FUNCTION update_warehouse_location_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_warehouse_locations_updated_at
  BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_location_updated_at();
