'use client'

import { useState } from 'react'

type TabType = 'financial' | 'clients' | 'attendance'

interface BusinessDashboardProps {
  userRole: string
  hasDxPackage: boolean
  financialContent: React.ReactNode
  clientsContent: React.ReactNode
  attendanceContent: React.ReactNode
}

export default function BusinessDashboardTabs({
  userRole,
  hasDxPackage,
  financialContent,
  clientsContent,
  attendanceContent,
}: BusinessDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('financial')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">経営ダッシュボード</h1>
          <p className="mt-2 text-sm text-gray-600">
            財務分析・取引先分析・月次勤怠を一元管理できます
          </p>
        </div>

        {/* 第1階層タブ */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {hasDxPackage && (
              <button
                onClick={() => setActiveTab('financial')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'financial'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                財務分析
              </button>
            )}

            {userRole === 'admin' && (
              <button
                onClick={() => setActiveTab('clients')}
                className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'clients'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                取引先分析
              </button>
            )}

            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'attendance'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              月次勤怠
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div>
          {activeTab === 'financial' && hasDxPackage && financialContent}
          {activeTab === 'clients' && userRole === 'admin' && clientsContent}
          {activeTab === 'attendance' && attendanceContent}
        </div>
      </div>
    </div>
  )
}
