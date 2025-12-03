'use client'

import { useState, useMemo } from 'react'
import { analyzeCosts, type ToolCostAnalysis } from '@/lib/analytics/cost-analysis'

interface Props {
  tools: any[]
  toolItems: any[]
  movements: any[]
  consumableMovements: any[]
  orders: any[]
  maintenanceRecords: any[]
  consumableInventory: any[]
}

export default function CostAnalyticsView({
  tools,
  toolItems,
  movements,
  consumableMovements,
  orders,
  maintenanceRecords,
  consumableInventory,
}: Props) {
  const [periodMonths, setPeriodMonths] = useState(12)
  const [sortBy, setSortBy] = useState<'cost' | 'efficiency'>('cost')
  const [filterType, setFilterType] = useState<'all' | 'tool' | 'consumable'>('all')

  // コスト分析実行
  const report = useMemo(() => {
    const today = new Date()
    const periodStart = new Date(today)
    periodStart.setMonth(today.getMonth() - periodMonths)

    return analyzeCosts(
      tools,
      toolItems,
      [...movements, ...consumableMovements],
      orders,
      maintenanceRecords,
      consumableInventory,
      periodStart,
      today
    )
  }, [tools, toolItems, movements, consumableMovements, orders, maintenanceRecords, consumableInventory, periodMonths])

  // フィルタリングとソート
  const filteredAndSorted = useMemo(() => {
    if (!report || !report.tool_analyses) return []

    let filtered = report.tool_analyses

    // タイプフィルタ
    if (filterType === 'tool') {
      filtered = filtered.filter((a) => !a.is_consumable)
    } else if (filterType === 'consumable') {
      filtered = filtered.filter((a) => a.is_consumable)
    }

    // ソート
    return filtered.sort((a, b) => {
      if (sortBy === 'cost') {
        return b.total_cost - a.total_cost
      } else {
        return b.cost_efficiency_score - a.cost_efficiency_score
      }
    })
  }, [report, filterType, sortBy])

  // CSVエクスポート
  const exportToCSV = () => {
    const headers = [
      '種別',
      '名前',
      'カテゴリ',
      '購入価格',
      '発注コスト',
      '点検・修理コスト',
      '総コスト',
      '移動回数',
      '移動あたりコスト',
      '効率スコア',
    ]

    const rows = filteredAndSorted.map((analysis) => [
      analysis.is_consumable ? '消耗品' : '道具',
      analysis.tool_name,
      analysis.category_name || '未分類',
      analysis.purchase_price || 0,
      analysis.total_order_cost,
      analysis.total_maintenance_cost,
      analysis.total_cost,
      analysis.movement_count,
      analysis.cost_per_movement?.toFixed(2) || '-',
      analysis.cost_efficiency_score.toFixed(1),
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cost_analytics_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">コスト分析レポート</h1>
          <p className="mt-1 text-sm text-gray-600">
            道具・消耗品のコスト分析と効率評価
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
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総コスト</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ¥{(report?.total_cost || 0).toLocaleString()}
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
                <svg className="h-6 w-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">道具コスト</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ¥{(report?.tool_cost || 0).toLocaleString()}
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
                <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">消耗品コスト</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    ¥{(report?.consumable_cost || 0).toLocaleString()}
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
                <svg className="h-6 w-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">分析対象</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {((report?.total_tools || 0) + (report?.total_consumables || 0))}件
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
              <option value={3}>過去3ヶ月</option>
              <option value={6}>過去6ヶ月</option>
              <option value={12}>過去1年</option>
              <option value={24}>過去2年</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="tool">道具のみ</option>
              <option value="consumable">消耗品のみ</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ソート</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="cost">コストが高い順</option>
              <option value="efficiency">効率スコアが高い順</option>
            </select>
          </div>
        </div>
      </div>

      {/* コスト分析テーブル */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                名前
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カテゴリ
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                購入価格
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                発注コスト
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                点検・修理
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                総コスト
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                移動回数
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                効率スコア
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSorted.map((analysis) => (
              <tr key={analysis.tool_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      analysis.is_consumable
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {analysis.is_consumable ? '消耗品' : '道具'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {analysis.tool_name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {analysis.category_name || '未分類'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  {analysis.purchase_price ? `¥${analysis.purchase_price.toLocaleString()}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ¥{analysis.total_order_cost.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                  ¥{analysis.total_maintenance_cost.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                  ¥{analysis.total_cost.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                  {analysis.movement_count}回
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <div
                      className={`w-16 h-2 rounded-full ${
                        analysis.cost_efficiency_score >= 70
                          ? 'bg-green-500'
                          : analysis.cost_efficiency_score >= 40
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.max(16, analysis.cost_efficiency_score / 100 * 64)}px` }}
                    />
                    <span className="text-xs font-medium">
                      {analysis.cost_efficiency_score.toFixed(0)}
                    </span>
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
