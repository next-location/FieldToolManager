-- Migration: Add qr_code column to sites table
-- Date: 2026-01-14
-- Purpose: Auto-generate QR codes for sites
-- How to apply:
--   1. Go to Supabase Dashboard > SQL Editor
--   2. Copy and paste this entire SQL
--   3. Click "Run"

-- Step 1: Add qr_code column (nullable first)
ALTER TABLE sites
  ADD COLUMN IF NOT EXISTS qr_code UUID DEFAULT uuid_generate_v4();

-- Step 2: Update existing sites without qr_code
UPDATE sites
SET qr_code = uuid_generate_v4()
WHERE qr_code IS NULL;

-- Step 3: Make qr_code NOT NULL
ALTER TABLE sites
  ALTER COLUMN qr_code SET NOT NULL;

-- Step 4: Create unique index
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sites_qr_code'
  ) THEN
    CREATE UNIQUE INDEX idx_sites_qr_code ON sites(qr_code);
  END IF;
END $$;

-- Step 5: Add comment
COMMENT ON COLUMN sites.qr_code IS '現場識別用QRコード（UUID、自動生成）';
