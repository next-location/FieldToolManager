-- Consumable management feature migration
-- Adds support for tracking consumable items with quantity-based inventory

-- 1. Add consumable management settings to organizations table
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS consumable_movement_tracking TEXT DEFAULT 'quantity' CHECK (consumable_movement_tracking IN ('quantity', 'simple', 'none'));

COMMENT ON COLUMN organizations.consumable_movement_tracking IS 'Pattern A: quantity, Pattern B: simple, Pattern C: none';

-- 2. Add management type and unit to tools table
ALTER TABLE tools
  ADD COLUMN IF NOT EXISTS management_type TEXT DEFAULT 'individual' CHECK (management_type IN ('individual', 'consumable')),
  ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT '個';

COMMENT ON COLUMN tools.management_type IS 'individual: track each item separately, consumable: track by quantity only';
COMMENT ON COLUMN tools.unit IS 'Unit of measurement for consumables (個/本/kg/L/箱/枚)';

-- 3. Create consumable inventory table
CREATE TABLE IF NOT EXISTS consumable_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  tool_id UUID NOT NULL REFERENCES tools(id) ON DELETE CASCADE,
  location_type TEXT NOT NULL CHECK (location_type IN ('warehouse', 'site')),
  site_id UUID REFERENCES sites(id) ON DELETE CASCADE,
  warehouse_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, tool_id, location_type, site_id, warehouse_location_id)
);

COMMENT ON TABLE consumable_inventory IS 'Tracks quantity-based inventory for consumable items';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_consumable_inventory_org ON consumable_inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_consumable_inventory_tool ON consumable_inventory(tool_id);
CREATE INDEX IF NOT EXISTS idx_consumable_inventory_location ON consumable_inventory(location_type, site_id);

-- Enable RLS
ALTER TABLE consumable_inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view consumable inventory in their organization"
  ON consumable_inventory FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert consumable inventory in their organization"
  ON consumable_inventory FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update consumable inventory in their organization"
  ON consumable_inventory FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete consumable inventory in their organization"
  ON consumable_inventory FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Auto-update trigger
CREATE TRIGGER update_consumable_inventory_updated_at
  BEFORE UPDATE ON consumable_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. Add consumable-related columns to tool_movements
ALTER TABLE tool_movements
  ADD COLUMN IF NOT EXISTS consumable_quantity INTEGER;

COMMENT ON COLUMN tool_movements.consumable_quantity IS 'Quantity moved for consumable items (null for individual items)';
