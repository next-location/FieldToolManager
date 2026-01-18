-- Add other_location_name column to heavy_equipment_usage_records
-- This allows equipment (vehicles) to be moved to non-site locations
-- Examples: client offices, business destinations, etc.

ALTER TABLE heavy_equipment_usage_records
ADD COLUMN other_location_name TEXT;

COMMENT ON COLUMN heavy_equipment_usage_records.other_location_name IS 'その他の場所名（現場以外の移動先）例: 取引先、営業先など';

-- Note: When other_location_name is set, the corresponding location_id will be NULL
-- This is only for equipment (heavy machinery), NOT for tools or consumables
