'use client'

import { useEffect, useState } from 'react'
import { ChartBarIcon, UserGroupIcon, BriefcaseIcon } from '@heroicons/react/24/outline'

interface AnalyticsData {
  period: { start: string; end: string }
  summary: {
    total_count: number
    total_amount: number
    average_amount: number
    approved_count: number
    approved_amount: number
    pending_count: number
    pending_amount: number
  }
  monthly_trend: Array<{ month: string; count: number; amount: number }>
  supplier_ranking: Array<{ id: string; name: string; code: string; count: number; amount: number }>
  project_ranking: Array<{ id: string; name: string; code: string; count: number; amount: number }>
  status_breakdown: Record<string, { count: number; amount: number }>
}

export function PurchaseOrderAnalyticsClient() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  // Fix React #418: Initialize dates in useEffect to avoid SSR/client mismatch
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Initialize dates on client-side only
  useEffect(() => {
    const now = new Date()
    const start = new Date()
    start.setMonth(start.getMonth() - 12)
    setStartDate(start.toISOString().slice(0, 10))
    setEndDate(now.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics()
    }
  }, [startDate, endDate])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({ start_date: startDate, end_date: endDate })
      const response = await fetch(`/api/purchase-orders/analytics?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch analytics')
      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">データの取得に失敗しました</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 期間選択 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">開始日</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">終了日</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-500">総発注数</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">{data.summary.total_count}</div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-500">総発注額</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ¥{data.summary.total_amount.toLocaleString()}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-500">平均発注額</div>
          <div className="mt-2 text-3xl font-bold text-gray-900">
            ¥{Math.round(data.summary.average_amount).toLocaleString()}
          </div>
        </div>
        <div className="bg-white shadow rounded-lg p-5">
          <div className="text-sm font-medium text-gray-500">承認待ち</div>
          <div className="mt-2 text-3xl font-bold text-orange-600">{data.summary.pending_count}</div>
          <div className="mt-1 text-xs text-gray-500">
            ¥{data.summary.pending_amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 月別推移 */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <ChartBarIcon className="h-6 w-6 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">月別推移</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">月</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">件数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.monthly_trend.map((item) => (
                <tr key={item.month}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {item.count}件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ¥{item.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 仕入先別ランキング */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <UserGroupIcon className="h-6 w-6 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">仕入先別ランキング（TOP10）</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">件数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.supplier_ranking.map((supplier, index) => (
                <tr key={supplier.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{supplier.name}</div>
                    <div className="text-xs text-gray-500">{supplier.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {supplier.count}件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ¥{supplier.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 工事別ランキング */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center mb-4">
          <BriefcaseIcon className="h-6 w-6 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">工事別ランキング（TOP10）</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">件数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.project_ranking.map((project, index) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{index + 1}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                    <div className="text-xs text-gray-500">{project.code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    {project.count}件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                    ¥{project.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
