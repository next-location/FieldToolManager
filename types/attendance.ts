// 出退勤管理機能の型定義

// ============================================================
// 組織の出退勤設定
// ============================================================
export interface OrganizationAttendanceSettings {
  organization_id: string;

  // 会社出勤設定
  office_attendance_enabled: boolean;
  office_clock_methods: {
    manual: boolean;
    qr_scan: boolean;
    qr_display: boolean;
  };
  office_qr_rotation_days: 1 | 3 | 7 | 30;

  // 現場出勤設定
  site_attendance_enabled: boolean;
  site_clock_methods: {
    manual: boolean;
    qr_scan: boolean;
    qr_display: boolean;
  };
  site_qr_type: 'leader' | 'fixed' | 'both';

  // 休憩時間設定
  break_time_mode: 'none' | 'simple' | 'detailed';
  auto_break_deduction: boolean;
  auto_break_minutes: number;

  // 通知設定
  checkin_reminder_enabled: boolean;
  checkin_reminder_time: string; // HH:MM形式
  checkout_reminder_enabled: boolean;
  checkout_reminder_time: string;
  admin_daily_report_enabled: boolean;
  admin_daily_report_time: string;
  admin_daily_report_email: boolean;
  qr_expiry_alert_enabled: boolean;
  qr_expiry_alert_email: boolean;
  overtime_alert_enabled: boolean;
  overtime_alert_hours: number;

  created_at: string;
  updated_at: string;
}

// ============================================================
// 現場の出退勤設定
// ============================================================
export interface SiteAttendanceSettings {
  site_id: string;
  organization_id: string;
  qr_mode: 'leader' | 'fixed';
  has_tablet: boolean;
  tablet_access_token: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// 会社QRコード
// ============================================================
export interface OfficeQRCode {
  id: string;
  organization_id: string;
  qr_data: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

// ============================================================
// 現場QRコード
// ============================================================
export interface SiteQRCode {
  id: string;
  organization_id: string;
  site_id: string;
  qr_type: 'leader' | 'fixed';

  // リーダー型の場合
  leader_user_id: string | null;
  generated_date: string | null;

  // 固定型の場合
  qr_data: string | null;
  expires_at: string | null;

  is_active: boolean;
  created_at: string;
}

// ============================================================
// 出退勤記録
// ============================================================
export interface AttendanceRecord {
  id: string;
  organization_id: string;
  user_id: string;
  date: string; // YYYY-MM-DD形式

  // 出勤情報
  clock_in_time: string;
  clock_in_location_type: 'office' | 'site' | 'remote';
  clock_in_site_id: string | null;
  clock_in_method: 'manual' | 'qr';
  clock_in_device_type: 'mobile' | 'tablet' | 'desktop' | null;

  // 退勤予定
  planned_checkout_location_type: 'office' | 'site' | 'remote' | 'direct_home' | null;
  planned_checkout_site_id: string | null;

  // 退勤情報（実績）
  clock_out_time: string | null;
  clock_out_location_type: 'office' | 'site' | 'remote' | 'direct_home' | null;
  clock_out_site_id: string | null;
  clock_out_method: 'manual' | 'qr' | null;
  clock_out_device_type: 'mobile' | 'tablet' | 'desktop' | null;

  // 休憩時間
  break_records: BreakRecord[];
  auto_break_deducted_minutes: number;

  // メタ情報
  notes: string | null;
  is_offline_sync: boolean;
  synced_at: string | null;
  is_manually_edited: boolean;
  edited_by: string | null;
  edited_at: string | null;
  edited_reason: string | null;

  created_at: string;
  updated_at: string;
}

// 休憩時間レコード
export interface BreakRecord {
  start: string; // ISO8601形式
  end: string | null; // ISO8601形式（休憩中の場合はnull）
}

// ============================================================
// アラート履歴
// ============================================================
export interface AttendanceAlert {
  id: string;
  organization_id: string;
  alert_type: 'missing_checkin' | 'missing_checkout' | 'qr_expiring' | 'overtime';
  target_user_id: string | null;
  target_date: string | null;
  message: string;
  metadata: Record<string, any> | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

// ============================================================
// タブレット端末
// ============================================================
export interface TerminalDevice {
  id: string;
  organization_id: string;
  device_name: string;
  device_type: 'office' | 'site';
  site_id: string | null;
  access_token: string;
  last_accessed_at: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

// ============================================================
// API リクエスト/レスポンス型
// ============================================================

// GET /api/attendance/settings のレスポンス
export interface GetAttendanceSettingsResponse {
  settings: OrganizationAttendanceSettings | null;
}

// PUT /api/attendance/settings のリクエスト
export interface UpdateAttendanceSettingsRequest {
  office_attendance_enabled?: boolean;
  office_clock_methods?: {
    manual: boolean;
    qr_scan: boolean;
    qr_display: boolean;
  };
  office_qr_rotation_days?: 1 | 3 | 7 | 30;
  site_attendance_enabled?: boolean;
  site_clock_methods?: {
    manual: boolean;
    qr_scan: boolean;
    qr_display: boolean;
  };
  site_qr_type?: 'leader' | 'fixed' | 'both';
  break_time_mode?: 'none' | 'simple' | 'detailed';
  auto_break_deduction?: boolean;
  auto_break_minutes?: number;
  checkin_reminder_enabled?: boolean;
  checkin_reminder_time?: string;
  checkout_reminder_enabled?: boolean;
  checkout_reminder_time?: string;
  admin_daily_report_enabled?: boolean;
  admin_daily_report_time?: string;
  admin_daily_report_email?: boolean;
  qr_expiry_alert_enabled?: boolean;
  qr_expiry_alert_email?: boolean;
  overtime_alert_enabled?: boolean;
  overtime_alert_hours?: number;
}

// PUT /api/attendance/settings のレスポンス
export interface UpdateAttendanceSettingsResponse {
  settings: OrganizationAttendanceSettings;
}

// POST /api/attendance/clock-in のリクエスト
export interface ClockInRequest {
  location_type: 'office' | 'site' | 'remote';
  site_id?: string;
  method: 'manual' | 'qr';
  qr_data?: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  planned_checkout_location_type?: 'office' | 'site' | 'remote' | 'direct_home';
  planned_checkout_site_id?: string;
}

// POST /api/attendance/clock-in のレスポンス
export interface ClockInResponse {
  record: AttendanceRecord;
}

// POST /api/attendance/clock-out のリクエスト
export interface ClockOutRequest {
  location_type: 'office' | 'site' | 'remote' | 'direct_home';
  site_id?: string;
  method: 'manual' | 'qr';
  qr_data?: string;
  device_type: 'mobile' | 'tablet' | 'desktop';
  break_minutes?: number; // 休憩時間（分）
}

// POST /api/attendance/clock-out のレスポンス
export interface ClockOutResponse {
  record: AttendanceRecord;
}

// GET /api/attendance/status のレスポンス
export interface AttendanceStatusResponse {
  today_record: AttendanceRecord | null;
  is_clocked_in: boolean;
  clock_in_time: string | null;
  clock_out_time: string | null;
  location_type: 'office' | 'site' | 'remote' | null;
  site_name: string | null;
}

// GET /api/attendance/records のクエリパラメータ
export interface GetAttendanceRecordsParams {
  user_id?: string;
  start_date?: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  location_type?: 'office' | 'site' | 'remote';
  site_id?: string;
  page?: number;
  limit?: number;
}

// GET /api/attendance/records のレスポンス
export interface GetAttendanceRecordsResponse {
  records: (AttendanceRecord & {
    user_name: string;
    user_email: string;
    site_name: string | null;
  })[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// PATCH /api/attendance/records/[id] のリクエスト
export interface UpdateAttendanceRecordRequest {
  clock_in_time?: string;
  clock_out_time?: string;
  break_records?: BreakRecord[];
  notes?: string;
  edited_reason: string; // 必須
}

// PATCH /api/attendance/records/[id] のレスポンス
export interface UpdateAttendanceRecordResponse {
  record: AttendanceRecord;
}
