-- Fix undefined warehouse location codes
-- This script fixes warehouse locations that were created with the old buggy code
-- that referenced non-existent columns (level_name, prefix, separator, digit_length)

-- Show current problematic data
SELECT
  id,
  code,
  display_name,
  organization_id,
  created_at
FROM warehouse_locations
WHERE code LIKE '%undefined%' OR display_name LIKE '%undefined%'
ORDER BY created_at DESC;

-- Option 1: Delete all problematic warehouse locations (論理削除)
-- Uncomment the following lines if you want to delete them:
/*
UPDATE warehouse_locations
SET deleted_at = NOW()
WHERE code LIKE '%undefined%' OR display_name LIKE '%undefined%';
*/

-- Option 2: Keep the records but mark them as inactive
-- Uncomment the following lines if you want to keep them but mark as inactive:
/*
UPDATE warehouse_locations
SET is_active = false
WHERE code LIKE '%undefined%' OR display_name LIKE '%undefined%';
*/

-- After running this script, users should:
-- 1. Go to warehouse settings and configure hierarchy (up to 5 levels)
-- 2. Create new warehouse locations using the fixed form
-- 3. The new form will correctly generate codes like "A-1-上" instead of "undefined1-undefined1-undefined1"
