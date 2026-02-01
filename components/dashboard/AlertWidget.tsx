'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Alert, Priority } from './types'

interface AlertWidgetProps {
  alerts: Alert[]
  className?: string
}

export function AlertWidget({ alerts, className = '' }: AlertWidgetProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id))

  if (visibleAlerts.length === 0) return null

  // Sort by priority
  const sortedAlerts = visibleAlerts.sort((a, b) => {
    const priorityOrder = { critical: 0, warning: 1, info: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  // On mobile, collapse non-critical alerts by default
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640
  const shouldShowCollapsed = isMobile && isCollapsed && !sortedAlerts.some(a => a.priority === 'critical')

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId))
  }

  const getPriorityStyles = (priority: Priority) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800'
    }
  }

  const getPriorityIcon = (priority: Priority) => {
    switch (priority) {
      case 'critical':
        return '🚨'
      case 'warning':
        return '⚠️'
      case 'info':
        return 'ℹ️'
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Mobile collapse header */}
      {isMobile && visibleAlerts.length > 1 && (
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="sm:hidden flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-900"
        >
          <span className="font-medium">
            アラート ({visibleAlerts.filter(a => a.priority === 'critical').length} 件の緊急)
          </span>
          <span className="text-xs">{isCollapsed ? '▼' : '▲'}</span>
        </button>
      )}

      <div className={shouldShowCollapsed ? 'hidden' : 'space-y-2'}>
        {sortedAlerts.map((alert) => (
          <div
            key={alert.id}
            className={`
              border rounded-lg p-3 sm:p-4
              ${getPriorityStyles(alert.priority)}
              ${alert.priority === 'critical' ? 'animate-pulse' : ''}
            `}
          >
            <div className="flex items-start">
              <span className="text-xl sm:text-2xl mr-2 sm:mr-3 flex-shrink-0">
                {getPriorityIcon(alert.priority)}
              </span>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium mb-1">
                  {alert.title}
                </h3>
                <p className="text-xs sm:text-sm opacity-90">
                  {alert.message}
                </p>

                {alert.link && (
                  <Link
                    href={alert.link}
                    className="inline-block mt-2 text-xs sm:text-sm font-medium hover:underline"
                  >
                    詳細を見る →
                  </Link>
                )}
              </div>

              {alert.dismissible && (
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="ml-2 text-sm hover:opacity-70 flex-shrink-0"
                  aria-label="閉じる"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}