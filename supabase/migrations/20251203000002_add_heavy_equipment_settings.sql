-- 重機管理機能 Phase 7.1: 組織設定への追加
-- 作成日: 2025-12-03

-- organizationsテーブルに重機管理設定を追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS heavy_equipment_enabled BOOLEAN DEFAULT false;

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS heavy_equipment_settings JSONB DEFAULT '{
  "enable_hour_meter": false,
  "enable_fuel_tracking": false,
  "vehicle_inspection_alert_days": 60,
  "insurance_alert_days": 60,
  "enable_operator_license_check": false
}'::jsonb;

-- コメント追加
COMMENT ON COLUMN organizations.heavy_equipment_enabled
IS '重機管理機能の有効/無効';

COMMENT ON COLUMN organizations.heavy_equipment_settings
IS '重機管理のオプション設定（メーター管理、燃料管理等）';
