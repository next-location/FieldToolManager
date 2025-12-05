'use client'

import { useEffect, useState } from 'react'

interface ClientStats {
  total: number
  active: number
  inactive: number
  byType: {
    customer: number
    supplier: number
    partner: number
    both: number
  }
  averageRating: number
  byRating: {
    5: number
    4: number
    3: number
    2: number
    1: number
    none: number
  }
  transactions: {
    totalAmount: number
    totalCount: number
    averageAmount: number
  }
  totalCreditLimit: number
  invoiceRegistered: number
  taxExempt: number
}

export default function ClientsStats() {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/clients/stats')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '統計情報の取得に失敗しました')
      }

      setStats(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '統計情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="space-y-6">
      {/* 基本統計 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">取引先サマリー</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-600 font-medium">総取引先数</div>
            <div className="text-3xl font-bold text-blue-900 mt-1">{stats.total}</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="text-sm text-green-600 font-medium">有効</div>
            <div className="text-3xl font-bold text-green-900 mt-1">{stats.active}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 font-medium">無効</div>
            <div className="text-3xl font-bold text-gray-900 mt-1">{stats.inactive}</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="text-sm text-yellow-600 font-medium">平均評価</div>
            <div className="text-3xl font-bold text-yellow-900 mt-1">
              {stats.averageRating > 0 ? (
                <>
                  {stats.averageRating.toFixed(1)}
                  <span className="text-base ml-1">⭐</span>
                </>
              ) : (
                '-'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 分類別統計 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">取引先分類</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">顧客</div>
              <div className="text-2xl font-bold text-gray-900">{stats.byType.customer}</div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500"
                style={{
                  width: `${stats.total > 0 ? (stats.byType.customer / stats.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">仕入先</div>
              <div className="text-2xl font-bold text-gray-900">{stats.byType.supplier}</div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500"
                style={{
                  width: `${stats.total > 0 ? (stats.byType.supplier / stats.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">協力会社</div>
              <div className="text-2xl font-bold text-gray-900">{stats.byType.partner}</div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500"
                style={{
                  width: `${stats.total > 0 ? (stats.byType.partner / stats.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">顧客兼仕入先</div>
              <div className="text-2xl font-bold text-gray-900">{stats.byType.both}</div>
            </div>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500"
                style={{
                  width: `${stats.total > 0 ? (stats.byType.both / stats.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 評価分布 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">評価分布</h2>
        <div className="space-y-3">
          {[5, 4, 3, 2, 1].map((rating) => (
            <div key={rating} className="flex items-center gap-3">
              <div className="w-16 text-sm text-gray-600">
                {'⭐'.repeat(rating)}
              </div>
              <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500"
                  style={{
                    width: `${stats.total > 0 ? (stats.byRating[rating as 5 | 4 | 3 | 2 | 1] / stats.total) * 100 : 0}%`,
                  }}
                ></div>
              </div>
              <div className="w-12 text-right text-sm font-medium text-gray-900">
                {stats.byRating[rating as 5 | 4 | 3 | 2 | 1]}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-3">
            <div className="w-16 text-sm text-gray-600">未評価</div>
            <div className="flex-1 h-6 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-400"
                style={{
                  width: `${stats.total > 0 ? (stats.byRating.none / stats.total) * 100 : 0}%`,
                }}
              ></div>
            </div>
            <div className="w-12 text-right text-sm font-medium text-gray-900">
              {stats.byRating.none}
            </div>
          </div>
        </div>
      </div>

      {/* 取引実績 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">取引実績</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">累計取引額</div>
            <div className="text-2xl font-bold text-gray-900">
              ¥{stats.transactions.totalAmount.toLocaleString()}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">取引回数</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.transactions.totalCount.toLocaleString()}回
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">平均取引額</div>
            <div className="text-2xl font-bold text-gray-900">
              ¥{Math.round(stats.transactions.averageAmount).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* その他統計 */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">その他統計</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">与信限度額合計</div>
            <div className="text-2xl font-bold text-gray-900">
              ¥{stats.totalCreditLimit.toLocaleString()}
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">インボイス登録事業者</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.invoiceRegistered}社
            </div>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">免税事業者</div>
            <div className="text-2xl font-bold text-gray-900">{stats.taxExempt}社</div>
          </div>
        </div>
      </div>
    </div>
  )
}
