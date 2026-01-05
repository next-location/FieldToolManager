'use client'

import { useState } from 'react'

interface FinancialTabsProps {
  salesContent: React.ReactNode
  cashflowContent: React.ReactNode
}

export default function FinancialTabs({ salesContent, cashflowContent }: FinancialTabsProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'cashflow'>('sales')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
      <div className="mb-6">
        <h1 className="text-lg sm:text-2xl font-bold mb-2">財務分析</h1>
        <p className="text-sm text-gray-600">売上分析と資金繰り予測を確認できます</p>
      </div>

      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'sales'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            売上分析
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'cashflow'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            資金繰り予測
          </button>
        </div>
      </div>

      {/* タブコンテンツ */}
      <div className={activeTab === 'sales' ? 'block' : 'hidden'}>
        {salesContent}
      </div>
      <div className={activeTab === 'cashflow' ? 'block' : 'hidden'}>
        {cashflowContent}
      </div>
      </div>
    </div>
  )
}
