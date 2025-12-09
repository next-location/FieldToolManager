'use client'

import { Suspense, useState } from 'react'
import SalesAnalytics from './SalesAnalytics'
import CashflowAnalytics from './CashflowAnalytics'

export default function FinancialAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<'sales' | 'cashflow'>('sales')

  return (
    <div className="container mx-auto px-4 py-8">
      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('sales')}
              className={`${
                activeTab === 'sales'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              売上分析
            </button>
            <button
              onClick={() => setActiveTab('cashflow')}
              className={`${
                activeTab === 'cashflow'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors`}
            >
              資金繰り予測
            </button>
          </nav>
        </div>
      </div>

      {/* タブコンテンツ */}
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        {activeTab === 'sales' ? <SalesAnalytics /> : <CashflowAnalytics />}
      </Suspense>
    </div>
  )
}
