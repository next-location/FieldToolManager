'use client'

import { useState } from 'react'

interface FinancialTabsProps {
  salesContent: React.ReactNode
  cashflowContent: React.ReactNode
}

export default function FinancialTabs({ salesContent, cashflowContent }: FinancialTabsProps) {
  const [activeTab, setActiveTab] = useState<'sales' | 'cashflow'>('sales')

  return (
    <div>
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
            未収・未払管理
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
  )
}
