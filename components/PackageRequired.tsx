'use client'

import Link from 'next/link'

interface PackageRequiredProps {
  packageType: 'asset' | 'dx' | 'full'
  featureName: string
  userRole?: string
  currentPackage?: 'asset' | 'dx' | 'none'
}

export function PackageRequired({ packageType, featureName, userRole, currentPackage = 'none' }: PackageRequiredProps) {
  const packageNames = {
    asset: '現場資産パック',
    dx: '現場DX業務効率化パック',
    full: 'フル機能統合パック',
  }

  const packagePrices = {
    asset: '¥18,000',
    dx: '¥22,000',
    full: '¥32,000',
  }

  const packageFeatures = {
    asset: [
      '道具・消耗品・重機の一元管理',
      'QRコードによる入出庫管理',
      '在庫・位置情報のリアルタイム追跡',
      '棚卸し機能',
    ],
    dx: [
      '作業報告書のデジタル化',
      '出退勤管理（GPS打刻対応）',
      '見積・請求書作成',
      '売上・入金管理',
    ],
    full: [
      '現場資産パックの全機能',
      '現場DX業務効率化パックの全機能',
      '統合ダッシュボード・分析機能',
      'お得な統合割引価格',
    ],
  }

  // 既存パッケージ保有者には、フル機能統合パックを推奨
  const recommendedPackage = (currentPackage === 'asset' || currentPackage === 'dx') ? 'full' : packageType

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* アイコン */}
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
          </div>

          {/* タイトル */}
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            この機能は {packageNames[recommendedPackage]} が必要です
          </h1>

          <p className="text-gray-600 text-center mb-6">
            「{featureName}」をご利用いただくには、{packageNames[recommendedPackage]}のご契約が必要です。
          </p>

          {/* パッケージ情報 */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {packageNames[recommendedPackage]}
              </h2>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">
                  {packagePrices[recommendedPackage]}
                </div>
                <div className="text-sm text-gray-600">/ 月</div>
              </div>
            </div>

            <ul className="space-y-2">
              {packageFeatures[recommendedPackage].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* アクション */}
          <div className="space-y-3">
            {isAdmin ? (
              <>
                <Link
                  href="/contact"
                  className="block w-full bg-blue-600 text-white text-center py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  アップグレードについて問い合わせる
                </Link>
              </>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 text-center">
                    パッケージの追加は組織管理者にお問い合わせください
                  </p>
                </div>
              </>
            )}

            <Link
              href="/"
              className="block w-full bg-gray-100 text-gray-700 text-center py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              ダッシュボードに戻る
            </Link>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            パッケージについて詳しく知りたい方は
            <a href="/manual" className="text-blue-600 hover:underline ml-1">
              マニュアル
            </a>
            をご覧ください
          </p>
        </div>
      </div>
    </div>
  )
}
