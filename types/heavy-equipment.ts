// 重機管理機能の型定義
// 作成日: 2025-12-03

// ==========================================
// Enum型定義
// ==========================================

export type OwnershipType = 'owned' | 'leased' | 'rented';
export type HeavyEquipmentStatus = 'available' | 'in_use' | 'maintenance' | 'out_of_service';
export type UsageActionType = 'checkout' | 'checkin' | 'transfer';
export type MaintenanceType = 'vehicle_inspection' | 'insurance_renewal' | 'repair' | 'other';

// ==========================================
// 重機カテゴリ
// ==========================================

export interface HeavyEquipmentCategory {
  id: string;
  organization_id: string | null;  // NULL = システム標準
  name: string;
  code_prefix: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

// ==========================================
// 重機マスタ
// ==========================================

export interface HeavyEquipment {
  id: string;
  organization_id: string;

  // 基本情報
  equipment_code: string;
  name: string;
  category_id: string | null;
  manufacturer: string | null;
  model_number: string | null;

  // 識別情報
  serial_number: string | null;
  registration_number: string | null;

  // 所有形態
  ownership_type: OwnershipType;
  supplier_company: string | null;
  contract_number: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  monthly_cost: number | null;

  // 購入情報
  purchase_date: string | null;
  purchase_price: number | null;

  // ステータス
  status: HeavyEquipmentStatus;
  current_location_id: string | null;
  current_user_id: string | null;

  // 車検
  requires_vehicle_inspection: boolean;
  vehicle_inspection_date: string | null;
  vehicle_inspection_reminder_days: number;

  // 保険
  insurance_company: string | null;
  insurance_policy_number: string | null;
  insurance_start_date: string | null;
  insurance_end_date: string | null;
  insurance_reminder_days: number;

  // メーター
  enable_hour_meter: boolean;
  current_hour_meter: number | null;

  // 添付
  photo_url: string | null;
  qr_code: string | null;

  // メタデータ
  notes: string | null;
  custom_fields: Record<string, any>;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// 使用記録
// ==========================================

export interface HeavyEquipmentUsageRecord {
  id: string;
  organization_id: string;
  equipment_id: string;
  user_id: string;
  action_type: UsageActionType;
  from_location_id: string | null;
  to_location_id: string | null;
  hour_meter_reading: number | null;
  action_at: string;
  notes: string | null;
  photo_urls: string[] | null;
  created_at: string;
}

// ==========================================
// 点検記録
// ==========================================

export interface HeavyEquipmentMaintenance {
  id: string;
  organization_id: string;
  equipment_id: string;
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  performed_by: string | null;
  cost: number | null;
  next_date: string | null;
  receipt_url: string | null;
  report_url: string | null;
  notes: string | null;
  created_at: string;
}

// ==========================================
// アラート
// ==========================================

export interface HeavyEquipmentAlert {
  equipment_id: string;
  equipment_name: string;
  alert_type: 'vehicle_inspection' | 'insurance_expiry' | 'lease_end';
  severity: 'info' | 'warning' | 'error';
  days_remaining: number;
  message: string;
  due_date: Date;
}

// ==========================================
// フォーム用型定義
// ==========================================

export interface HeavyEquipmentFormData {
  equipment_code?: string;
  name: string;
  category_id: string;
  manufacturer?: string;
  model_number?: string;
  serial_number?: string;
  registration_number?: string;

  // 所有形態
  ownership_type: OwnershipType;
  supplier_company?: string;
  contract_number?: string;
  contract_start_date?: string;
  contract_end_date?: string;
  monthly_cost?: number;
  purchase_date?: string;
  purchase_price?: number;

  // 車検・保険
  requires_vehicle_inspection: boolean;
  vehicle_inspection_date?: string;
  vehicle_inspection_reminder_days?: number;
  insurance_company?: string;
  insurance_policy_number?: string;
  insurance_start_date?: string;
  insurance_end_date?: string;
  insurance_reminder_days?: number;

  // オプション
  enable_hour_meter: boolean;
  current_hour_meter?: number;

  photo_url?: string;
  notes?: string;
}

export interface UsageRecordFormData {
  equipment_id: string;
  action_type: UsageActionType;
  from_location_id?: string;
  to_location_id?: string;
  hour_meter_reading?: number;
  notes?: string;
  photo_urls?: string[];
}

export interface MaintenanceFormData {
  equipment_id: string;
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  performed_by?: string;
  cost?: number;
  next_date?: string;
  receipt_url?: string;
  report_url?: string;
  notes?: string;
}

// ==========================================
// 組織設定
// ==========================================

export interface HeavyEquipmentSettings {
  enable_hour_meter: boolean;
  enable_fuel_tracking: boolean;
  vehicle_inspection_alert_days: number;
  insurance_alert_days: number;
  enable_operator_license_check: boolean;
}

// ==========================================
// 統計・集計用
// ==========================================

export interface HeavyEquipmentStats {
  total: number;
  available: number;
  in_use: number;
  maintenance: number;
  out_of_service: number;
  vehicle_inspection_due: number;
  insurance_expiring: number;
  lease_ending: number;
  monthly_lease_cost: number;
  total_value: number;
}

// ==========================================
// リスト表示用（JOIN後のデータ）
// ==========================================

export interface HeavyEquipmentWithRelations extends HeavyEquipment {
  category_name?: string;
  current_location_name?: string;
  current_user_name?: string;
  current_user_avatar?: string;
  alerts?: HeavyEquipmentAlert[];
}

export interface UsageRecordWithRelations extends HeavyEquipmentUsageRecord {
  equipment_name: string;
  equipment_code: string;
  user_name: string;
  from_location_name?: string;
  to_location_name?: string;
}
