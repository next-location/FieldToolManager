'use client'

import { useState, useMemo } from 'react'
import { analyzeUsage, type UsageAnalysis } from '@/lib/analytics/usage-analysis'

interface Props {
  tools: any[]
  movements: any[]
  sites: any[]
  users: any[]
}

export default function UsageAnalyticsView({ tools, movements, sites, users }: Props) {
  const [periodMonths, setPeriodMonths] = useState(6)
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'rarely_used'>('all')
  const [sortBy, setSortBy] = useState<'usage' | 'score'>('score')

  // 使用頻度分析実行
  const report = useMemo(() => {
    const today = new Date()
    const periodStart = new Date(today)
    periodStart.setMonth(today.getMonth() - periodMonths)

    return analyzeUsage(tools, movements, sites, users, periodStart, today)
  }, [tools, movements, sites, users, periodMonths])

  // フィルタリングとソート
  const filteredAndSorted = useMemo(() => {
    let filtered = report.usage_analyses

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter)
    }

    // ソート
    return filtered.sort((a, b) => {
      if (sortBy === 'usage') {
        return b.total_movements - a.total_movements
      } else {
        return b.usage_score - a.usage_score
      }
    })
  }, [report, statusFilter, sortBy])

  // CSVエクスポート
  const exportToCSV = () => {
    const headers = [
      '種別',
      '名前',
      'カテゴリ',
      '総移動回数',
      '持出回数',
      '返却回数',
      '月平均移動回数',
      '最終使用日',
      '未使用日数',
      '利用率スコア',
      'ステータス',
      '最も使用されている現場',
      '最も使用しているユーザー',
    ]

    const rows = filteredAndSorted.map((analysis) => [
      analysis.is_consumable ? '消耗品' : '道具',
      analysis.tool_name,
      analysis.category_name || '未分類',
      analysis.total_movements,
      analysis.checkout_count,
      analysis.checkin_count,
      analysis.average_movements_per_month.toFixed(1),
      analysis.last_usage_date ? new Date(analysis.last_usage_date).toLocaleDateString('ja-JP') : '未使用',
      analysis.days_since_last_use || 0,
      analysis.usage_score.toFixed(1),
      analysis.status === 'active' ? '活発' : analysis.status === 'inactive' ? '非活発' : 'ほとんど未使用',
      analysis.most_active_site || '-',
      analysis.most_active_user || '-',
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `usage_analytics_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '活発'
      case 'inactive':
        return '非活発'
      case 'rarely_used':
        return 'ほとんど未使用'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-yellow-100 text-yellow-800'
      case 'rarely_used':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">使用頻度分析</h1>
          <p className="mt-1 text-sm text-gray-600">
            道具・消耗品の使用パターンと利用状況を分析
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span>CSVエクスポート</span>
        </button>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総移動回数</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {report.total_movements}回
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">活発</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {report.active_tools}件
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">非活発</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {report.inactive_tools}件
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-6 w-6 rounded-full bg-red-100 flex items-center justify-center">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">ほとんど未使用</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {report.rarely_used_tools}件
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* フィルター */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分析期間</label>
            <select
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value={1}>過去1ヶ月</option>
              <option value={3}>過去3ヶ月</option>
              <option value={6}>過去6ヶ月</option>
              <option value={12}>過去1年</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ステータス</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="active">活発</option>
              <option value="inactive">非活発</option>
              <option value="rarely_used">ほとんど未使用</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ソート</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="score">利用率スコアが高い順</option>
              <option value="usage">使用回数が多い順</option>
            </select>
          </div>
        </div>
      </div>

      {/* 使用頻度分析テーブル */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                名前
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                総移動回数
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                月平均
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最終使用日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最も使用されている現場
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                利用率スコア
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSorted.map((analysis) => (
              <tr key={analysis.tool_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{analysis.tool_name}</div>
                  <div className="text-sm text-gray-500">{analysis.category_name || '未分類'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {analysis.total_movements}回
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {analysis.average_movements_per_month.toFixed(1)}回
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {analysis.last_usage_date
                    ? new Date(analysis.last_usage_date).toLocaleDateString('ja-JP')
                    : '未使用'}
                  {analysis.days_since_last_use !== null && (
                    <div className="text-xs text-gray-400">
                      {analysis.days_since_last_use}日前
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {analysis.most_active_site || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                      analysis.status
                    )}`}
                  >
                    {getStatusLabel(analysis.status)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <div
                      className={`h-2 rounded-full ${
                        analysis.usage_score >= 70
                          ? 'bg-green-500'
                          : analysis.usage_score >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{
                        width: `${Math.max(16, (analysis.usage_score / 100) * 64)}px`,
                      }}
                    />
                    <span className="text-xs font-medium">{analysis.usage_score.toFixed(0)}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
