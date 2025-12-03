'use client'

import { useState } from 'react'
import { QRScanner } from './QRScanner'

type TabType = 'single' | 'bulk' | 'info' | 'inventory' | 'location'

export function QRScanTabs() {
  const [activeTab, setActiveTab] = useState<TabType>('single')

  const tabs = [
    {
      id: 'single' as TabType,
      name: '単体移動',
      icon: '📱',
      description: '1つの道具をスキャンして移動登録',
    },
    {
      id: 'bulk' as TabType,
      name: '一括移動',
      icon: '📦',
      description: '複数の道具をスキャンして一括で移動登録',
    },
    {
      id: 'info' as TabType,
      name: '道具確認',
      icon: '🔍',
      description: '道具の詳細情報・状態・履歴を確認',
    },
    {
      id: 'inventory' as TabType,
      name: '在庫確認',
      icon: '📊',
      description: '現在の在庫状況と場所を確認',
    },
    {
      id: 'location' as TabType,
      name: '倉庫/現場確認',
      icon: '📍',
      description: '倉庫位置や現場のQRコードをスキャンして情報を取得',
    },
  ]

  return (
    <div className="bg-white shadow sm:rounded-lg">
      {/* タブヘッダー */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-2 px-4 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-4 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors
                ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="p-6">
        {/* 説明文 */}
        <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-2xl">{tabs.find((t) => t.id === activeTab)?.icon}</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                {tabs.find((t) => t.id === activeTab)?.name}
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                {tabs.find((t) => t.id === activeTab)?.description}
              </p>
            </div>
          </div>
        </div>

        {/* 各タブのコンテンツ */}
        {activeTab === 'single' && (
          <div>
            <QRScanner mode="single" />
          </div>
        )}

        {activeTab === 'bulk' && (
          <div>
            <p className="text-gray-600 mb-4">
              複数の道具をスキャンした後、移動先を選択して一括登録します
            </p>
            <QRScanner mode="bulk" />
          </div>
        )}

        {activeTab === 'info' && (
          <div>
            <p className="text-gray-600 mb-4">
              道具のQRコードをスキャンすると、詳細情報が表示されます
            </p>
            <QRScanner mode="info" />
          </div>
        )}

        {activeTab === 'inventory' && (
          <div>
            <p className="text-gray-600 mb-4">
              道具をスキャンして現在の在庫状況を確認できます
            </p>
            <QRScanner mode="inventory" />
          </div>
        )}

        {activeTab === 'location' && (
          <div>
            <p className="text-gray-600 mb-4">
              倉庫位置や現場のQRコードをスキャンして情報を表示します
            </p>
            <QRScanner mode="location" />
          </div>
        )}
      </div>
    </div>
  )
}
