'use client'

import { useState, useMemo } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { analyzeCosts, type ToolCostAnalysis } from '@/lib/analytics/cost-analysis'
import CostAnalyticsPageMobileMenu from '@/components/analytics/CostAnalyticsPageMobileMenu'
import CostAnalyticsFiltersModal from '@/components/analytics/CostAnalyticsFiltersModal'

interface Props {
  tools: any[]
  toolItems: any[]
  movements: any[]
  consumableMovements: any[]
  orders: any[]
  consumableInventory: any[]
}

export default function CostAnalyticsView({
  tools,
  toolItems,
  movements,
  consumableMovements,
  orders,
  consumableInventory,
}: Props) {
  const [periodMonths, setPeriodMonths] = useState(12)
  const [sortBy, setSortBy] = useState<'cost' | 'efficiency' | 'category'>('cost')
  const [filterType, setFilterType] = useState<'all' | 'tool' | 'consumable'>('all')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

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
      consumableInventory,
      periodStart,
      today
    )
  }, [tools, toolItems, movements, consumableMovements, orders, consumableInventory, periodMonths])

  // フィルタリングとソート
  const filteredAndSorted = useMemo(() => {
    if (!report || !report.tool_analyses) return []

    console.log('[Cost View] filterType:', filterType, 'sortBy:', sortBy)
    console.log('[Cost View] report.tool_analyses count:', report.tool_analyses.length)

    let filtered = report.tool_analyses

    // タイプフィルタ
    if (filterType === 'tool') {
      filtered = filtered.filter((a) => !a.is_consumable)
      console.log('[Cost View] Filtered to tools only:', filtered.length, 'items')
    } else if (filterType === 'consumable') {
      filtered = filtered.filter((a) => a.is_consumable)
      console.log('[Cost View] Filtered to consumables only:', filtered.length, 'items')
    } else {
      console.log('[Cost View] No filter applied, showing all:', filtered.length, 'items')
    }

    // ソート
    const sorted = filtered.sort((a, b) => {
      if (sortBy === 'cost') {
        return b.total_cost - a.total_cost
      } else if (sortBy === 'efficiency') {
        return b.cost_efficiency_score - a.cost_efficiency_score
      } else if (sortBy === 'category') {
        const categoryA = a.category_name || '未分類'
        const categoryB = b.category_name || '未分類'
        return categoryA.localeCompare(categoryB, 'ja')
      }
      return 0
    })

    console.log('[Cost View] Sorted result (first 3):', sorted.slice(0, 3).map(a => ({
      name: a.tool_name,
      is_consumable: a.is_consumable,
      total_cost: a.total_cost,
      purchase_price: a.purchase_price,
      efficiency: a.cost_efficiency_score
    })))

    return sorted
  }, [report, filterType, sortBy])

  // CSVエクスポート
  const exportToCSV = () => {
    const headers = [
      '種別',
      '名前',
      'カテゴリ',
      '購入価格',
      '現場持ち出し回数',
      '持ち出し単価',
      '最終使用日',
      '在庫数',
      '在庫金額',
      '月平均消費量',
    ]

    const rows = filteredAndSorted.map((analysis) => [
      analysis.is_consumable ? '消耗品' : '道具',
      analysis.tool_name,
      analysis.category_name || '未分類',
      analysis.purchase_price || 0,
      !analysis.is_consumable ? analysis.site_checkout_count : '-',
      !analysis.is_consumable ? (analysis.site_checkout_unit_cost ? Math.round(analysis.site_checkout_unit_cost) : '-') : '-',
      !analysis.is_consumable ? (analysis.last_used_date ? new Date(analysis.last_used_date).toLocaleDateString('ja-JP') : '-') : '-',
      analysis.is_consumable ? analysis.current_inventory : '-',
      analysis.is_consumable ? Math.round(analysis.inventory_value) : '-',
      analysis.is_consumable ? Math.round(analysis.monthly_avg_consumption) : '-',
    ])

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `cost_analytics_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6 space-y-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">コスト分析レポート</h1>
          <div className="hidden sm:flex">
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
          <div className="sm:hidden">
            <CostAnalyticsPageMobileMenu onExport={exportToCSV} />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          道具・消耗品のコスト分析と効率評価
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
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

      {/* フィルター - モバイル */}
      <div className="sm:hidden">
        <button
          onClick={() => setIsFilterModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
        >
          <SlidersHorizontal className="h-5 w-5 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">絞り込み</span>
        </button>
      </div>

      {/* フィルター - PC */}
      <div className="hidden sm:block bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-1">
              分析期間
            </label>
            <select
              id="period"
              value={periodMonths}
              onChange={(e) => setPeriodMonths(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value={3}>過去3ヶ月</option>
              <option value={6}>過去6ヶ月</option>
              <option value={12}>過去1年</option>
              <option value={24}>過去2年</option>
            </select>
          </div>
          <div>
            <label htmlFor="filterType" className="block text-sm font-medium text-gray-700 mb-1">
              種別
            </label>
            <select
              id="filterType"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              <option value="tool">道具のみ</option>
              <option value="consumable">消耗品のみ</option>
            </select>
          </div>
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
              ソート
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="cost">コストが高い順</option>
              <option value="efficiency">効率スコアが高い順</option>
              <option value="category">カテゴリ順</option>
            </select>
          </div>
        </div>
      </div>

      {/* コスト分析テーブル - PC */}
      <div className="hidden sm:block bg-white shadow overflow-hidden sm:rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                種別
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                名前
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                カテゴリ
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                購入価格
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                現場持ち出し
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                持ち出し単価
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                最終使用日
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                在庫数
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                在庫金額
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 tracking-wider whitespace-nowrap">
                月平均消費
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSorted.map((analysis) => (
              <tr key={analysis.tool_id} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      analysis.is_consumable
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {analysis.is_consumable ? '消耗品' : '道具'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {analysis.tool_name}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {analysis.category_name || '未分類'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                  {analysis.purchase_price ? `¥${analysis.purchase_price.toLocaleString()}` : '-'}
                </td>
                {/* 道具の場合 */}
                {!analysis.is_consumable && (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {analysis.site_checkout_count}回
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {analysis.site_checkout_unit_cost ? `¥${Math.round(analysis.site_checkout_unit_cost).toLocaleString()}` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">
                      {analysis.last_used_date ? new Date(analysis.last_used_date).toLocaleDateString('ja-JP') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
                  </>
                )}
                {/* 消耗品の場合 */}
                {analysis.is_consumable && (
                  <>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-right">-</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {analysis.current_inventory.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      ¥{Math.round(analysis.inventory_value).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right">
                      {Math.round(analysis.monthly_avg_consumption).toLocaleString()}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル用カードビュー */}
      <div className="sm:hidden space-y-3">
        {filteredAndSorted.map((analysis) => (
          <div key={analysis.tool_id} className="bg-white shadow rounded-lg p-4 border border-gray-200">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      analysis.is_consumable
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {analysis.is_consumable ? '消耗品' : '道具'}
                  </span>
                  <span className="text-xs text-gray-500">{analysis.category_name || '未分類'}</span>
                </div>
                <h3 className="font-medium text-gray-900">{analysis.tool_name}</h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-500">総コスト</span>
                <p className="font-semibold text-gray-900">¥{analysis.total_cost.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-gray-500">移動回数</span>
                <p className="font-medium text-gray-900">{analysis.movement_count}回</p>
              </div>
              <div>
                <span className="text-gray-500">購入価格</span>
                <p className="font-medium text-gray-900">
                  {analysis.purchase_price ? `¥${analysis.purchase_price.toLocaleString()}` : '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-500">効率スコア</span>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={`flex-1 h-2 rounded-full ${
                      analysis.cost_efficiency_score >= 70
                        ? 'bg-green-500'
                        : analysis.cost_efficiency_score >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{ width: `${Math.max(20, analysis.cost_efficiency_score)}%` }}
                  />
                  <span className="text-xs font-medium">{analysis.cost_efficiency_score.toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* フィルターモーダル */}
      <CostAnalyticsFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        periodMonths={periodMonths}
        filterType={filterType}
        sortBy={sortBy}
        onPeriodChange={setPeriodMonths}
        onFilterTypeChange={setFilterType}
        onSortByChange={setSortBy}
      />
      </div>
    </div>
  )
}
