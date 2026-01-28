'use client'

import { useState } from 'react'
import { AttendanceBasicSettings } from './tabs/AttendanceBasicSettings'
import { AttendanceWorkPatterns } from './tabs/AttendanceWorkPatterns'
import { AttendanceAlertsSettings } from './tabs/AttendanceAlertsSettings'
import { AttendanceMVPSettings } from './tabs/AttendanceMVPSettings'
import { AttendanceTerminalsTab } from './tabs/AttendanceTerminalsTab'

type Tab = 'basic' | 'patterns' | 'alerts' | 'mvp' | 'terminals'

interface AttendanceSettingsUnifiedProps {
  initialSettings: any | null
  organizationId: string
  organizationName: string
  userRole: string
  sitesList?: Array<{ id: string; name: string }>
}

export function AttendanceSettingsUnified({
  initialSettings,
  organizationId,
  organizationName,
  userRole,
  sitesList = [],
}: AttendanceSettingsUnifiedProps) {
  const [activeTab, setActiveTab] = useState<Tab>('basic')

  const tabs = [
    { id: 'basic' as Tab, label: '基本設定' },
    { id: 'patterns' as Tab, label: '勤務パターン' },
    { id: 'alerts' as Tab, label: 'アラート・通知' },
    { id: 'mvp' as Tab, label: '出退勤アラート' },
    { id: 'terminals' as Tab, label: 'タブレット端末' },
  ]

  return (
    <div>
      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
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
        {activeTab === 'terminals' && (
          <AttendanceTerminalsTab
            sitesList={sitesList}
            userRole={userRole}
          />
        )}
      </div>
    </div>
  )
}
