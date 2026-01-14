-- Add qr_print_size column to organizations table
-- Date: 2026-01-14

-- Step 1: Add qr_print_size column (nullable initially)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS qr_print_size INTEGER DEFAULT 25;

-- Step 2: Migrate existing data from organization_settings to organizations
UPDATE organizations o
SET qr_print_size = COALESCE(
  (SELECT qr_print_size FROM organization_settings WHERE organization_id = o.id),
  25
)
WHERE qr_print_size IS NULL OR qr_print_size = 25;

-- Step 3: Add comment
COMMENT ON COLUMN organizations.qr_print_size IS 'QRコード印刷サイズ（mm）: 20, 25, 30, 50';
