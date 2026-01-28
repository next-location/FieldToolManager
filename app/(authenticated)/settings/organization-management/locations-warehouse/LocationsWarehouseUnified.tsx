'use client'

import { useState } from 'react'
import Link from 'next/link'
import SitesListTab from './tabs/SitesListTab'
import WarehouseLocationsTab from './tabs/WarehouseLocationsTab'

type Tab = 'sites' | 'warehouse'

interface LocationsWarehouseUnifiedProps {
  locations: any[]
  warehouseLocations: any[]
  organizationId: string
}

export default function LocationsWarehouseUnified({
  locations,
  warehouseLocations,
  organizationId,
}: LocationsWarehouseUnifiedProps) {
  const [activeTab, setActiveTab] = useState<Tab>('sites')

  const tabs = [
    { id: 'sites' as Tab, label: '拠点一覧' },
    { id: 'warehouse' as Tab, label: '倉庫位置管理' },
  ]

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 sm:px-0">
        {/* パンくずリスト */}
        <nav className="flex mb-4 text-sm text-gray-500">
          <Link href="/settings/organization-management" className="hover:text-gray-700">
            組織管理
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-900">自社拠点・倉庫</span>
        </nav>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">自社拠点・倉庫</h1>

        {/* タブナビゲーション（勤怠管理と同じスタイル） */}
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
          {activeTab === 'sites' && (
            <SitesListTab locations={locations} />
          )}
          {activeTab === 'warehouse' && (
            <WarehouseLocationsTab
              locations={warehouseLocations}
              organizationId={organizationId}
            />
          )}
        </div>
      </div>
    </div>
  )
}
