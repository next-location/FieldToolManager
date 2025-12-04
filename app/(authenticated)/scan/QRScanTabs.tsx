'use client'

import { useState } from 'react'
import { QRScanner } from './QRScanner'

type TabType = 'single' | 'bulk' | 'info' | 'inventory' | 'location'

interface QRScanTabsProps {
  showTabs?: boolean
}

export function QRScanTabs({ showTabs = true }: QRScanTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('single')

  const tabs = [
    {
      id: 'single' as TabType,
      name: '単体移動',
      description: '1つの道具をスキャンして移動登録',
    },
    {
      id: 'bulk' as TabType,
      name: '一括移動',
      description: '複数の道具をスキャンして一括で移動登録',
    },
    {
      id: 'info' as TabType,
      name: '道具確認',
      description: '道具の詳細情報・状態・履歴を確認',
    },
    {
      id: 'inventory' as TabType,
      name: '在庫確認',
      description: '現在の在庫状況と場所を確認',
    },
    {
      id: 'location' as TabType,
      name: '倉庫/現場確認',
      description: '倉庫位置や現場のQRコードをスキャンして情報を取得',
    },
  ]

  return (
    <>
      {showTabs && (
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
                {tab.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        {/* タブコンテンツ */}
        <div className="p-6">
          {/* 説明文 */}
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                {tabs.find((t) => t.id === activeTab)?.name}
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                {tabs.find((t) => t.id === activeTab)?.description}
              </p>
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
    </>
  )
}
