-- Pad existing tool item serial numbers from 3 digits to 5 digits
-- Example: "001" -> "00001", "999" -> "00999"

-- Update serial numbers that are exactly 3 digits
UPDATE tool_items
SET serial_number = LPAD(serial_number, 5, '0')
WHERE serial_number ~ '^\d{1,4}$'
  AND LENGTH(serial_number) < 5;

-- Verify the update
-- SELECT serial_number, COUNT(*)
-- FROM tool_items
-- GROUP BY serial_number
-- ORDER BY serial_number;
