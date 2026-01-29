'use client'

import { useState, Suspense } from 'react'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import CostAnalyticsView from '../cost/CostAnalyticsView'
import UsageAnalyticsView from '../usage/UsageAnalyticsView'
import dynamic from 'next/dynamic'

const InventoryOptimization = dynamic(() => import('../inventory/page'), {
  ssr: false,
  loading: () => <LoadingSpinner inline />,
})

type TabType = 'cost' | 'usage' | 'inventory'

interface AssetsDashboardProps {
  tools: any[]
  toolItems: any[]
  movements: any[]
  consumableMovements: any[]
  orders: any[]
  consumableInventory: any[]
}

export default function AssetsDashboard({
  tools,
  toolItems,
  movements,
  consumableMovements,
  orders,
  consumableInventory,
}: AssetsDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cost')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">資産管理分析</h1>
          <p className="mt-2 text-sm text-gray-600">
            道具・消耗品のコスト・使用状況・在庫を一元管理できます
          </p>
        </div>

        {/* 第1階層タブ */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('cost')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cost'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              コスト分析
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'usage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              使用状況
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              在庫状況
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div>
          {activeTab === 'cost' && (
            <CostAnalyticsView
              tools={tools}
              toolItems={toolItems}
              movements={movements}
              consumableMovements={consumableMovements}
              orders={orders}
              consumableInventory={consumableInventory}
            />
          )}

          {activeTab === 'usage' && (
            <Suspense fallback={<LoadingSpinner inline />}>
              <UsageAnalyticsView />
            </Suspense>
          )}

          {activeTab === 'inventory' && (
            <Suspense fallback={<LoadingSpinner inline />}>
              <InventoryOptimization />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
