'use client'

import { useState } from 'react'
import { AttendanceBasicSettings } from './tabs/AttendanceBasicSettings'
import { AttendanceWorkPatterns } from './tabs/AttendanceWorkPatterns'
import { AttendanceAlertsSettings } from './tabs/AttendanceAlertsSettings'
import { AttendanceMVPSettings } from './tabs/AttendanceMVPSettings'

type Tab = 'basic' | 'patterns' | 'alerts' | 'mvp'

interface AttendanceSettingsUnifiedProps {
  initialSettings: any | null
  organizationId: string
  organizationName: string
  userRole: string
}

export function AttendanceSettingsUnified({
  initialSettings,
  organizationId,
  organizationName,
  userRole,
}: AttendanceSettingsUnifiedProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic')

  const tabs = [
    { id: 'basic' as Tab, label: '基本設定' },
    { id: 'patterns' as Tab, label: '勤務パターン' },
    { id: 'alerts' as Tab, label: 'アラート・通知' },
    { id: 'mvp' as Tab, label: '出退勤アラート' },
  ]

  return (
    <div>
      {/* タブナビゲーション */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div>
        {activeTab === 'basic' && (
          <AttendanceBasicSettings
            initialSettings={initialSettings}
            organizationId={organizationId}
          />
        )}
        {activeTab === 'patterns' && (
          <AttendanceWorkPatterns
            organizationId={organizationId}
            userRole={userRole}
            organizationName={organizationName}
          />
        )}
        {activeTab === 'alerts' && (
          <AttendanceAlertsSettings
            initialSettings={initialSettings}
            organizationId={organizationId}
          />
        )}
        {activeTab === 'mvp' && (
          <AttendanceMVPSettings
            organizationId={organizationId}
          />
        )}
      </div>
    </div>
  )
}
