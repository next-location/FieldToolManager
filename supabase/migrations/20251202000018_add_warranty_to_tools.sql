-- Add warranty expiration date to tools table
-- Migration: 20251202000018_add_warranty_to_tools.sql

-- Add warranty_expiration_date column to tools
ALTER TABLE tools
ADD COLUMN warranty_expiration_date DATE;

-- Add comment
COMMENT ON COLUMN tools.warranty_expiration_date IS 'Warranty expiration date for the tool';

-- Create index for warranty expiration date (for efficient querying of expiring warranties)
CREATE INDEX idx_tools_warranty_expiration ON tools(warranty_expiration_date)
WHERE warranty_expiration_date IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX idx_tools_warranty_expiration IS 'Index for finding tools with expiring warranties';
