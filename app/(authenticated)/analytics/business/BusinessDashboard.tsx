'use client'

import { useState, Suspense } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import SalesAnalytics from '../financial/SalesAnalytics'
import CashflowAnalytics from '../financial/CashflowAnalytics'
import FinancialTabs from '../financial/FinancialTabs'
import ClientsStats from '@/app/(authenticated)/clients/ClientsStats'
import MonthlyReport from '@/app/(authenticated)/attendance/reports/monthly/MonthlyReport'

type TabType = 'financial' | 'clients' | 'attendance'

interface BusinessDashboardProps {
  userRole: string
}

export default function BusinessDashboard({ userRole }: BusinessDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('financial')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">経営ダッシュボード</h1>
          <p className="mt-2 text-sm text-gray-600">
            財務・取引先・勤怠の経営分析を一元管理できます
          </p>
        </div>

        {/* 第1階層タブ */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
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
          {activeTab === 'financial' && (
            <Suspense fallback={<LoadingSpinner inline />}>
              <FinancialTabs
                salesContent={<SalesAnalytics />}
                cashflowContent={<CashflowAnalytics />}
              />
            </Suspense>
          )}

          {activeTab === 'clients' && userRole === 'admin' && (
            <div className="max-w-7xl mx-auto">
              <div className="mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">取引先統計・分析</h2>
                <p className="mt-2 text-sm text-gray-600">
                  取引先（顧客・仕入先・協力会社）に関する経営分析と意思決定を支援します
                </p>
              </div>
              <ClientsStats />
            </div>
          )}

          {activeTab === 'attendance' && (
            <Suspense fallback={<LoadingSpinner inline />}>
              <MonthlyReport />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
