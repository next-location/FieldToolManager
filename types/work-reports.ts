// 作業報告書機能の型定義

// 天候タイプ
export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | ''

// 報告書ステータス
export type WorkReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected'

// 写真タイプ
export type PhotoType = 'before' | 'during' | 'after' | 'issue' | 'other'

// 添付ファイルタイプ
export type AttachmentType = 'drawing' | 'specification' | 'manual' | 'other'

// 作業者情報
export interface WorkerEntry {
  user_id: string
  name: string
  work_hours?: number // 作業時間（時間）
}

// カスタムフィールド定義
export interface CustomFieldDefinition {
  name: string
  type: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'time'
  options?: string[] // selectタイプの場合の選択肢
  required?: boolean
  unit?: string // 単位（例: m²、kg）
}

// 作業報告書
export interface WorkReport {
  id: string
  organization_id: string

  // コア項目
  site_id: string
  report_date: string // ISO date string
  weather: WeatherType
  description: string

  // 作業時間
  work_start_time?: string // HH:MM
  work_end_time?: string // HH:MM
  break_minutes?: number

  // 作業者
  workers: WorkerEntry[]

  // オプション項目
  work_location?: string
  progress_rate?: number // 0-100
  materials_used?: string[]
  tools_used?: string[] // tool_items.id

  // 安全・品質
  safety_incidents?: boolean
  safety_incident_details?: string
  quality_issues?: boolean
  quality_issue_details?: string

  // 顧客対応
  client_contact?: boolean
  client_contact_details?: string

  // 次回作業
  next_tasks?: string

  // カスタムフィールド
  custom_fields?: Record<string, any>

  // 承認フロー
  status: WorkReportStatus
  submitted_at?: string
  submitted_by?: string
  approved_at?: string
  approved_by?: string
  rejected_at?: string
  rejected_by?: string
  rejection_reason?: string

  // メタデータ
  created_by: string
  created_at: string
  updated_at: string
  deleted_at?: string

  // リレーション（SELECT時に取得）
  site?: {
    id: string
    name: string
  }
  created_by_user?: {
    id: string
    name: string
    email: string
  }
  photos?: WorkReportPhoto[]
  attachments?: WorkReportAttachment[]
}

// 作業報告書写真
export interface WorkReportPhoto {
  id: string
  organization_id: string
  work_report_id: string

  photo_url: string
  photo_type: PhotoType
  caption?: string

  latitude?: number
  longitude?: number

  file_size?: number
  mime_type?: string

  uploaded_by?: string
  uploaded_at: string
}

// 作業報告書添付ファイル
export interface WorkReportAttachment {
  id: string
  organization_id: string
  work_report_id: string

  file_url: string
  file_name: string
  file_type: AttachmentType
  description?: string

  file_size?: number
  mime_type?: string

  uploaded_by?: string
  uploaded_at: string
}

// 組織の報告書設定
export interface OrganizationReportSettings {
  id: string
  organization_id: string

  // よく使う項目のON/OFF
  enable_work_location: boolean
  enable_progress_rate: boolean
  enable_materials_used: boolean
  enable_tools_used: boolean
  enable_safety_incidents: boolean
  enable_quality_issues: boolean
  enable_client_contact: boolean
  enable_next_tasks: boolean

  // 写真・添付ファイル
  enable_photos: boolean
  max_photos: number
  enable_attachments: boolean
  max_attachments: number
  max_file_size_mb: number

  // 承認フロー
  require_approval: boolean
  approval_required_roles: string[] // ['leader', 'admin']

  // カスタムフィールド定義
  custom_field_definitions: CustomFieldDefinition[]

  created_at: string
  updated_at: string
}

// 作業報告書作成フォーム用の型
export interface WorkReportFormData {
  // コア項目
  site_id: string
  report_date: string
  weather: WeatherType
  description: string

  // 作業時間
  work_start_time?: string
  work_end_time?: string
  break_minutes?: number

  // 作業者
  worker_ids: string[] // 選択された作業者のID配列

  // オプション項目
  work_location?: string
  progress_rate?: number
  materials_used?: string[]
  tools_used?: string[]

  // 安全・品質
  safety_incidents?: boolean
  safety_incident_details?: string
  quality_issues?: boolean
  quality_issue_details?: string

  // 顧客対応
  client_contact?: boolean
  client_contact_details?: string

  // 次回作業
  next_tasks?: string

  // カスタムフィールド
  custom_fields?: Record<string, any>
}

// 作業報告書一覧フィルター
export interface WorkReportFilter {
  date_from?: string
  date_to?: string
  site_id?: string
  worker_id?: string
  status?: WorkReportStatus
  search?: string
}

// 作業報告書一覧ソート
export type WorkReportSort = 'date_desc' | 'date_asc' | 'created_desc' | 'created_asc'

// API レスポンス型
export interface WorkReportListResponse {
  data: WorkReport[]
  total: number
  page: number
  per_page: number
}

export interface WorkReportDetailResponse {
  data: WorkReport
}

export interface WorkReportCreateResponse {
  data: WorkReport
}

export interface WorkReportUpdateResponse {
  data: WorkReport
}

// 承認アクション
export interface ApprovalAction {
  action: 'submit' | 'approve' | 'reject'
  rejection_reason?: string // rejectの場合のみ
}

// 統計データ
export interface WorkReportStats {
  total_reports: number
  draft_reports: number
  submitted_reports: number
  approved_reports: number
  rejected_reports: number
  reports_this_month: number
  reports_this_week: number
}
