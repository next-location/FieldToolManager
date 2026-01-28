'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useFeatures } from '@/hooks/useFeatures'

export default function FeatureSettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const features = useFeatures()

  // パッケージチェック（Sidebarと同じロジック）
  const hasDxPackage = features.contract.packages.dx_efficiency
  const hasFullPackage = features.package_type === 'full'
  const canUseDxFeatures = hasDxPackage || hasFullPackage

  useEffect(() => {
    // ユーザー権限チェック
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (res.ok) {
          const data = await res.json()
          setUserRole(data.role)

          // Admin以外はアクセス不可
          if (data.role !== 'admin') {
            router.push('/')
            return
          }
        }
      } catch (error) {
        console.error('Failed to check auth:', error)
        router.push('/')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600">読み込み中...</div>
      </div>
    )
  }

  if (userRole !== 'admin' || !canUseDxFeatures) {
    return (
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-yellow-900 mb-2">
              DXパックが必要です
            </h2>
            <p className="text-sm text-yellow-800">
              この機能を利用するには、現場DX業務効率化パックまたはフル機能統合パックの契約が必要です。
            </p>
          </div>
        </div>
      </div>
    )
  }

  const featureCards = [
    {
      title: '勤怠管理',
      description: '出退勤設定、勤務パターン、アラート通知、タブレット端末の管理',
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      href: '/attendance/settings',
      badge: '5つのタブ',
    },
    {
      title: '作業報告書設定',
      description: 'カスタムフィールド、承認フロー、オプション項目の管理',
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      href: '/work-reports/settings',
    },
  ]

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pt-3 sm:px-0 sm:py-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">機能設定</h1>
        <p className="text-sm text-gray-600 mb-6">
          DXパック専用機能の詳細設定を管理します
        </p>

        {/* 機能カード */}
        <div className="grid gap-6 md:grid-cols-2">
          {featureCards.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">{feature.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {feature.title}
                      </h2>
                      {feature.badge && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {feature.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
