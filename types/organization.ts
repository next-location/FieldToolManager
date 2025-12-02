export interface IndustryCategory {
  id: string
  parent_id: string | null
  name: string
  name_en: string | null
  description: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OrganizationSettings {
  id: string
  organization_id: string
  enable_low_stock_alert: boolean
  default_minimum_stock_level: number
  require_checkout_approval: boolean
  require_return_approval: boolean
  enable_email_notifications: boolean
  notification_email: string | null
  theme: 'light' | 'dark'
  custom_settings: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  subdomain: string
  representative_name: string | null
  phone: string | null
  postal_code: string | null
  address: string | null
  industry_category_id: string | null
  setup_completed_at: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface OnboardingFormData {
  // Step 1: 組織情報
  organizationName: string
  representativeName: string
  phone: string
  postalCode: string
  address: string
  industryCategoryIds: string[]  // 複数選択対応

  // Step 2: 運用設定
  enableLowStockAlert: boolean
  requireCheckoutApproval: boolean
  requireReturnApproval: boolean

  // Step 3: カテゴリー設定
  selectedCategories: string[]

  // Step 4: 初期ユーザー招待
  inviteUsers: Array<{
    email: string
    role: 'admin' | 'leader' | 'staff'
  }>
}
