'use client'

import { Suspense } from 'react'
import { UserRole, PackageType } from './types'
import { AlertWidget } from './AlertWidget'
import { QuickActionWidget } from './QuickActionWidget'
import { StatusCardWidget } from './StatusCardWidget'
import { useDashboard } from '@/hooks/useDashboard'

interface DashboardContainerProps {
  userRole: UserRole
  packageType: PackageType
  organizationId: string
  userId: string
  organizationName?: string
}

export function DashboardContainer({
  userRole,
  packageType,
  organizationId,
  userId,
  organizationName
}: DashboardContainerProps) {
  const {
    alerts,
    quickActions,
    statusCards,
    isLoading,
    error,
    refetch
  } = useDashboard({ userRole, packageType, organizationId, userId })

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-20 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="h-16 bg-gray-200 rounded-lg"></div>
          <div className="h-16 bg-gray-200 rounded-lg"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium mb-2">エラーが発生しました</h3>
        <p className="text-red-600 text-sm mb-4">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          再読み込み
        </button>
      </div>
    )
  }

  // Role-based welcome message
  const getWelcomeMessage = () => {
    const hour = new Date().getHours()
    let greeting = ''
    if (hour < 12) greeting = 'おはようございます'
    else if (hour < 18) greeting = 'こんにちは'
    else greeting = 'お疲れ様です'

    const roleTitle = {
      admin: '管理者',
      manager: 'マネージャー',
      leader: 'リーダー',
      staff: 'スタッフ'
    }[userRole]

    return `${greeting}、${roleTitle}権限でログイン中です`
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          ダッシュボード
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          {getWelcomeMessage()}
        </p>
        {organizationName && (
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            {organizationName}
          </p>
        )}
      </div>

      {/* Alert Section */}
      {alerts.length > 0 && (
        <section aria-label="アラート">
          <AlertWidget alerts={alerts} />
        </section>
      )}

      {/* Quick Actions Section */}
      {quickActions.length > 0 && (
        <section aria-label="クイックアクション">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            クイックアクション
          </h2>
          <QuickActionWidget actions={quickActions} />
        </section>
      )}

      {/* Status Cards Section */}
      {statusCards.length > 0 && (
        <section aria-label="ステータス">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            現在の状況
          </h2>
          <StatusCardWidget cards={statusCards} />
        </section>
      )}

      {/* Empty State */}
      {alerts.length === 0 && quickActions.length === 0 && statusCards.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">表示するデータがありません</p>
          <button
            onClick={() => refetch()}
            className="mt-4 text-blue-600 hover:underline"
          >
            データを再読み込み
          </button>
        </div>
      )}
    </div>
  )
}