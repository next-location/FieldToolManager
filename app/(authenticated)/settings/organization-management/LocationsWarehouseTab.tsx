'use client'

import { useState } from 'react'
import Link from 'next/link'

type SubTab = 'sites' | 'warehouse'

export default function LocationsWarehouseTab() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('sites')

  const subTabs = [
    { id: 'sites' as SubTab, label: '拠点一覧', href: '/settings/locations' },
    { id: 'warehouse' as SubTab, label: '倉庫位置管理', href: '/warehouse-locations' },
  ]

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">
        自社の物理拠点と、倉庫内の細かい位置を管理します
      </p>

      {/* サブタブナビゲーション */}
      <div className="mb-6">
        <div className="flex space-x-2 border-b border-gray-200">
          {subTabs.map((tab) => (
            <Link
              key={tab.id}
              href={tab.href}
              className={`
                px-4 py-2 text-sm font-medium border-b-2 transition-colors
                ${activeSubTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              onClick={() => setActiveSubTab(tab.id)}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>

      {/* サブタブの説明カード */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/settings/locations"
          className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 p-6"
        >
          <div className="flex items-start space-x-4">
            <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">拠点一覧</h3>
              <p className="mt-2 text-sm text-gray-600">
                本社倉庫、支店、資材置き場、重機置き場、駐車場などの自社拠点を登録・管理します
              </p>
              <div className="mt-4 flex items-center text-sm text-blue-600">
                <span>拠点を管理</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/warehouse-locations"
          className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 p-6"
        >
          <div className="flex items-start space-x-4">
            <svg className="w-8 h-8 text-purple-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">倉庫位置管理</h3>
              <p className="mt-2 text-sm text-gray-600">
                倉庫内の細かい位置（エリア、棚、段など）を管理します。QRコード印刷にも対応しています
              </p>
              <div className="mt-4 flex items-center text-sm text-blue-600">
                <span>倉庫位置を管理</span>
                <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* 補足説明 */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-900">拠点と倉庫位置の違い</h4>
            <p className="mt-1 text-sm text-blue-800">
              <strong>拠点一覧:</strong> 物理的な場所（本社、支店など）を管理<br />
              <strong>倉庫位置管理:</strong> 拠点内の細かい保管場所（A棚1段など）を管理
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
