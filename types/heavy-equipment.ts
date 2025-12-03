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
// コスト管理用
// ==========================================

export interface EquipmentCostSummary {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  ownership_type: OwnershipType;

  // リース・レンタルコスト
  monthly_cost: number | null;
  total_lease_cost: number;  // 契約期間全体のコスト
  months_remaining: number | null;  // 残り月数

  // 購入資産（自社所有）
  purchase_price: number | null;
  purchase_date: string | null;
  book_value: number | null;  // 簿価（減価償却後）
  depreciation: number | null;  // 減価償却累計額
  depreciation_rate: number;  // 償却率（定額法）

  // 点検・修理コスト
  maintenance_cost_total: number;
  maintenance_cost_this_year: number;
  maintenance_cost_this_month: number;

  // 総コスト
  total_cost_this_year: number;
  total_cost_this_month: number;
}

export interface CostReport {
  period_start: string;
  period_end: string;

  // 所有形態別集計
  owned_equipment_count: number;
  owned_equipment_value: number;
  owned_maintenance_cost: number;

  leased_equipment_count: number;
  leased_monthly_cost: number;
  leased_annual_cost: number;

  rented_equipment_count: number;
  rented_monthly_cost: number;
  rented_annual_cost: number;

  // 全体サマリー
  total_equipment_count: number;
  total_monthly_cost: number;
  total_annual_cost: number;
  total_maintenance_cost: number;
  grand_total_cost: number;

  // 詳細データ
  equipment_details: EquipmentCostSummary[];
}

export interface DepreciationCalculation {
  equipment_id: string;
  purchase_price: number;
  purchase_date: string;
  useful_life_years: number;  // 耐用年数
  depreciation_method: 'straight_line' | 'declining_balance';  // 定額法 | 定率法
  annual_depreciation: number;
  accumulated_depreciation: number;
  book_value: number;  // 簿価
  depreciation_complete: boolean;
}

// ==========================================
// 稼働率分析用
// ==========================================

export interface OperationAnalysis {
  equipment_id: string;
  equipment_code: string;
  equipment_name: string;
  ownership_type: OwnershipType;

  // 稼働日数
  total_days: number;  // 分析期間の総日数
  operation_days: number;  // 実稼働日数
  operation_rate: number;  // 稼働率 (%)

  // 使用回数
  checkout_count: number;  // 持出回数
  total_usage_count: number;  // 総使用回数

  // メーター情報（オプション）
  total_hour_meter: number | null;  // 総稼働時間
  average_daily_hours: number | null;  // 1日平均稼働時間

  // コスト効率
  monthly_cost: number | null;  // 月額コスト
  cost_per_operation_day: number | null;  // 稼働日あたりコスト
  cost_efficiency_score: number;  // コスト効率スコア（0-100）
}

export interface AnalyticsReport {
  period_start: string;
  period_end: string;
  total_days: number;

  // 全体サマリー
  total_equipment_count: number;
  average_operation_rate: number;
  high_performers_count: number;  // 稼働率80%以上
  low_performers_count: number;  // 稼働率30%以下

  // 所有形態別分析
  owned_avg_operation_rate: number;
  leased_avg_operation_rate: number;
  rented_avg_operation_rate: number;

  // 詳細データ
  equipment_analytics: OperationAnalysis[];
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
