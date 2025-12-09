'use client'

import { useState } from 'react'

interface FinancialTabsProps {
  salesContent: React.ReactNode
  cashflowContent: React.ReactNode
}

export default function FinancialTabs({ salesContent, cashflowContent }: FinancialTabsProps) {
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
      <div className={activeTab === 'sales' ? 'block' : 'hidden'}>
        {salesContent}
      </div>
      <div className={activeTab === 'cashflow' ? 'block' : 'hidden'}>
        {cashflowContent}
      </div>
    </div>
  )
}
