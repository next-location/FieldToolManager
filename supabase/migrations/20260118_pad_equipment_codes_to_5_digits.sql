-- Pad existing equipment codes from 3 digits to 5 digits
-- Example: "BH-001" -> "BH-00001", "DT-002" -> "DT-00002"

-- Update equipment codes that have format: PREFIX-XXX (where XXX is 1-4 digits)
UPDATE heavy_equipment
SET equipment_code = REGEXP_REPLACE(
  equipment_code,
  '^([A-Z]+)-(\d{1,4})$',
  '\1-' || LPAD('\2', 5, '0')
)
WHERE equipment_code ~ '^[A-Z]+-\d{1,4}$'
  AND deleted_at IS NULL;

-- Verify the update
-- SELECT equipment_code, COUNT(*)
-- FROM heavy_equipment
-- WHERE deleted_at IS NULL
-- GROUP BY equipment_code
-- ORDER BY equipment_code;
