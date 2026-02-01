'use client'

import { useState, useEffect } from 'react'
import { UserRole, PackageType, DashboardConfig } from '@/components/dashboard/types'

interface UseDashboardProps {
  userRole: UserRole
  packageType: PackageType
  organizationId: string
  userId: string
}

interface DashboardData extends DashboardConfig {
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDashboard({
  userRole,
  packageType,
  organizationId,
  userId
}: UseDashboardProps): DashboardData {
  const [config, setConfig] = useState<DashboardConfig>({
    alerts: [],
    quickActions: [],
    statusCards: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Fetch alerts, stats, and other dashboard data based on role and package
      const [alertsRes, statsRes] = await Promise.all([
        fetch('/api/dashboard/alerts'),
        fetch('/api/dashboard/stats')
      ])

      const [alertsData, statsData] = await Promise.all([
        alertsRes.json(),
        statsRes.json()
      ])

      // Build configuration based on role and package
      const newConfig = buildDashboardConfig({
        userRole,
        packageType,
        alerts: alertsData.alerts || [],
        stats: statsData
      })

      setConfig(newConfig)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch dashboard data'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()

    // Set up auto-refresh for real-time updates
    const interval = setInterval(fetchDashboardData, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [userRole, packageType, organizationId, userId])

  return {
    ...config,
    isLoading,
    error,
    refetch: fetchDashboardData
  }
}

// Build dashboard configuration based on user role and package
function buildDashboardConfig({
  userRole,
  packageType,
  alerts,
  stats
}: {
  userRole: UserRole
  packageType: PackageType
  alerts: any[]
  stats: any
}): DashboardConfig {
  const config: DashboardConfig = {
    alerts: [],
    quickActions: [],
    statusCards: []
  }

  // Configure alerts based on role
  config.alerts = filterAlertsByRole(alerts, userRole)

  // Configure quick actions based on role and package
  config.quickActions = getQuickActionsForRole(userRole, packageType)

  // Configure status cards based on role and package
  config.statusCards = getStatusCardsForRole(userRole, packageType, stats)

  return config
}

function filterAlertsByRole(alerts: any[], role: UserRole) {
  // Filter alerts based on user role
  return alerts.filter(alert => {
    if (role === 'admin') return true // Admin sees all alerts
    if (role === 'manager' && alert.level !== 'system') return true
    if (role === 'leader' && alert.scope === 'team') return true
    if (role === 'staff' && alert.userId) return true // Only personal alerts
    return false
  }).map(alert => ({
    id: alert.id,
    priority: alert.severity || 'info',
    title: alert.title,
    message: alert.message,
    link: alert.link,
    dismissible: alert.dismissible !== false,
    createdAt: alert.created_at ? new Date(alert.created_at) : undefined
  }))
}

function getQuickActionsForRole(role: UserRole, packageType: PackageType) {
  const actions = []

  // Common actions for all users
  if (packageType === 'asset' || packageType === 'full') {
    actions.push({
      id: 'qr-scan',
      label: 'QRスキャン',
      icon: '🔍',
      href: '/scan',
      variant: 'primary' as const,
      size: role === 'staff' ? 'large' as const : 'medium' as const
    })
  }

  // Role-specific actions
  switch (role) {
    case 'staff':
      if (packageType === 'dx' || packageType === 'full') {
        // Note: Attendance buttons will be rendered as special components in QuickActionWidget
        actions.push(
          { id: 'clock-in', label: '出勤打刻', icon: '⏰', onClick: () => {}, variant: 'primary' as const, size: 'large' as const },
          { id: 'clock-out', label: '退勤打刻', icon: '🚪', onClick: () => {}, variant: 'secondary' as const, size: 'large' as const }
        )
      }
      if (packageType === 'asset' || packageType === 'full') {
        actions.push({ id: 'my-tools', label: '持出中リスト', icon: '📋', href: '/movements/my', size: 'medium' as const })
      }
      break

    case 'leader':
      if (packageType === 'asset' || packageType === 'full') {
        actions.push(
          { id: 'tool-set', label: '道具セット一括', icon: '📦', href: '/tool-sets' },
          { id: 'team-tools', label: 'チーム道具状況', icon: '👥', href: '/movements/team' }
        )
      }
      if (packageType === 'dx' || packageType === 'full') {
        actions.push(
          { id: 'team-qr', label: '出退勤QR表示', icon: '📱', href: '/attendance/qr/leader' },
          { id: 'team-attendance', label: 'チーム勤怠', icon: '👥', href: '/attendance/team' }
        )
      }
      break

    case 'manager':
      if (packageType === 'asset' || packageType === 'full') {
        actions.push(
          { id: 'inventory', label: '在庫調整', icon: '📊', href: '/consumables' },
          { id: 'equipment', label: '重機管理', icon: '🚜', href: '/equipment' },
          { id: 'analysis', label: '稼働率分析', icon: '📈', href: '/analytics/tools' }
        )
      }
      if (packageType === 'dx' || packageType === 'full') {
        actions.push(
          { id: 'approve', label: '一括承認', icon: '✅', href: '/approvals' },
          { id: 'purchase', label: '発注書作成', icon: '📄', href: '/purchase-orders/new' },
          { id: 'attendance-analysis', label: '勤怠分析', icon: '📊', href: '/analytics/attendance' }
        )
      }
      break

    case 'admin':
      actions.push(
        { id: 'settings', label: 'マスタ設定', icon: '⚙️', href: '/settings/organization', variant: 'secondary' as const }
      )
      if (packageType === 'asset' || packageType === 'full') {
        actions.push(
          { id: 'stocktaking', label: '棚卸し開始', icon: '📊', href: '/stocktaking' },
          { id: 'audit', label: '監査ログ', icon: '🔍', href: '/audit-logs' }
        )
      }
      if (packageType === 'dx' || packageType === 'full') {
        actions.push(
          { id: 'monthly-report', label: '月次レポート', icon: '📈', href: '/reports/monthly' },
          { id: 'contract', label: '契約管理', icon: '💼', href: '/settings/contract' }
        )
      }
      break
  }

  return actions
}

function getStatusCardsForRole(role: UserRole, packageType: PackageType, stats: any) {
  const cards = []
  let priority = 1

  // Build status cards based on role and package
  switch (role) {
    case 'staff':
      if (packageType === 'asset' || packageType === 'full') {
        if (stats.myTools) {
          cards.push({
            id: 'my-tools-count',
            title: '持出中の道具',
            value: stats.myTools.count || 0,
            subtitle: '件',
            priority: priority++
          })
        }
      }
      if (packageType === 'dx' || packageType === 'full') {
        if (stats.attendance) {
          cards.push({
            id: 'work-hours',
            title: '今日の勤務時間',
            value: stats.attendance.todayHours || '0:00',
            subtitle: stats.attendance.status || '未出勤',
            priority: priority++
          })
        }
      }
      break

    case 'leader':
      if (packageType === 'asset' || packageType === 'full') {
        if (stats.teamTools) {
          cards.push({
            id: 'team-tools',
            title: 'チーム道具利用',
            value: stats.teamTools.inUse || 0,
            subtitle: `全${stats.teamTools.total || 0}件中`,
            priority: priority++
          })
        }
      }
      if (packageType === 'dx' || packageType === 'full') {
        if (stats.teamAttendance) {
          cards.push({
            id: 'team-attendance',
            title: 'チーム出勤状況',
            value: `${stats.teamAttendance.present || 0}/${stats.teamAttendance.total || 0}`,
            subtitle: '名出勤中',
            priority: priority++
          })
        }
      }
      break

    case 'manager':
      if (packageType === 'asset' || packageType === 'full') {
        if (stats.toolUtilization) {
          cards.push({
            id: 'tool-utilization',
            title: '道具稼働率',
            value: `${stats.toolUtilization.rate || 0}%`,
            trend: stats.toolUtilization.trend,
            priority: priority++
          })
        }
        if (stats.inventory) {
          cards.push({
            id: 'low-stock',
            title: '在庫不足',
            value: stats.inventory.lowStock || 0,
            subtitle: '品目',
            priority: priority++
          })
        }
      }
      if (packageType === 'dx' || packageType === 'full') {
        if (stats.purchaseOrders) {
          cards.push({
            id: 'pending-approval',
            title: '承認待ち発注書',
            value: stats.purchaseOrders.pending || 0,
            subtitle: `総額 ¥${(stats.purchaseOrders.totalAmount || 0).toLocaleString()}`,
            priority: priority++
          })
        }
      }
      break

    case 'admin':
      if (stats.organization) {
        cards.push({
          id: 'active-users',
          title: 'アクティブユーザー',
          value: stats.organization.activeUsers || 0,
          subtitle: `全${stats.organization.totalUsers || 0}名中`,
          priority: priority++
        })
      }
      if (packageType === 'full' && stats.kpi) {
        cards.push({
          id: 'monthly-cost',
          title: '今月のコスト',
          value: `¥${(stats.kpi.monthlyCost || 0).toLocaleString()}`,
          trend: stats.kpi.costTrend,
          priority: priority++
        })
      }
      break
  }

  return cards.sort((a, b) => a.priority - b.priority)
}