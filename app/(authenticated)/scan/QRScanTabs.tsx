'use client'

import { useState, useEffect } from 'react'
import { QRScanner } from './QRScanner'
import { QRScannerMobile } from './QRScannerMobile'

type TabType = 'tool' | 'equipment'

interface QRScanTabsProps {
  showTabs?: boolean
}

export function QRScanTabs({ showTabs = true }: QRScanTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('tool')
  const [isMobile, setIsMobile] = useState(false)
  const [showMobileScanner, setShowMobileScanner] = useState(false)

  useEffect(() => {
    // クライアントサイドでモバイル判定
    setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent))
  }, [])

  const tabs = [
    {
      id: 'tool' as TabType,
      name: '道具移動',
      description: '道具のQRコードをスキャンして移動ページへ',
    },
    {
      id: 'equipment' as TabType,
      name: '重機移動',
      description: '重機のQRコードをスキャンして移動ページへ',
    },
  ]

  return (
    <>
      {showTabs && (
        <div className="mb-6">
          {/* モバイルの場合は2x2グリッド、PCの場合は横並び */}
          <div className={isMobile ? 'grid grid-cols-2 gap-2' : 'flex space-x-2'}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  isMobile ? 'px-3 py-3' : 'px-4 py-2'
                } rounded-md text-sm font-medium transition-colors ${
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
          {/* モバイルの場合 */}
          {isMobile ? (
            <div>
              <button
                onClick={() => setShowMobileScanner(true)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                スキャン開始
              </button>

              {/* モバイルスキャナーをフルスクリーンで表示 */}
              {showMobileScanner && (
                <QRScannerMobile
                  mode={activeTab}
                  onClose={() => setShowMobileScanner(false)}
                />
              )}
            </div>
          ) : (
            // PCの場合は従来のスキャナーを使用
            <>
              {activeTab === 'tool' && (
                <div>
                  <p className="text-gray-600 mb-4">
                    道具のQRコードをスキャンすると、移動登録ページに移動します
                  </p>
                  <QRScanner mode="tool" />
                </div>
              )}

              {activeTab === 'equipment' && (
                <div>
                  <p className="text-gray-600 mb-4">
                    重機のQRコードをスキャンすると、移動登録ページに移動します
                  </p>
                  <QRScanner mode="equipment" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
