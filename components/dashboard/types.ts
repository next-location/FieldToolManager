// Dashboard Widget Types
export type UserRole = 'admin' | 'manager' | 'leader' | 'staff'
export type PackageType = 'asset' | 'dx' | 'full' | 'none'
export type Priority = 'critical' | 'warning' | 'info'
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// Alert Types
export interface Alert {
  id: string
  priority: Priority
  title: string
  message: string
  link?: string
  dismissible?: boolean
  createdAt?: Date
}

// Quick Action Types
export interface QuickAction {
  id: string
  label: string
  icon: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'small' | 'medium' | 'large'
}

// Widget Base Interface
export interface WidgetProps {
  userRole: UserRole
  packageType: PackageType
  organizationId: string
  userId: string
  className?: string
}

// Status Card Types
export interface StatusCard {
  id: string
  title: string
  value: string | number
  subtitle?: string
  trend?: {
    value: number
    direction: 'up' | 'down'
    label: string
  }
  link?: string
  priority?: number
  icon?: string
}

// Dashboard Configuration
export interface DashboardConfig {
  alerts: Alert[]
  quickActions: QuickAction[]
  statusCards: StatusCard[]
}

// Widget Registry
export interface WidgetRegistryEntry {
  id: string
  component: React.ComponentType<WidgetProps>
  requiredRole?: UserRole[]
  requiredPackage?: PackageType[]
  priority: number
  gridArea?: {
    mobile: { cols: number; rows: number }
    tablet: { cols: number; rows: number }
    desktop: { cols: number; rows: number }
  }
}