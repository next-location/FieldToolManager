'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import type {
  HeavyEquipment,
  HeavyEquipmentUsageRecord,
  HeavyEquipmentMaintenance,
  AnalyticsReport,
} from '@/types/heavy-equipment'
import { generateAnalyticsReport } from '@/lib/equipment-analytics'
import { generateEquipmentCostSummary, formatCurrency, getOwnershipTypeLabel } from '@/lib/equipment-cost'
import {
  getOperationRateColor,
  getOperationRateBgColor,
} from '@/lib/equipment-analytics'
import EquipmentAnalyticsMobileMenu from '@/components/equipment/EquipmentAnalyticsMobileMenu'
import EquipmentAnalyticsPeriodModal from '@/components/equipment/EquipmentAnalyticsPeriodModal'

interface AnalyticsReportViewProps {
  equipment: HeavyEquipment[]
  usageMap: Record<string, HeavyEquipmentUsageRecord[]>
  maintenanceMap: Record<string, HeavyEquipmentMaintenance[]>
  defaultPeriodStart: string
  defaultPeriodEnd: string
  userRole: string
}

export default function AnalyticsReportView({
  equipment,
  usageMap,
  maintenanceMap,
  defaultPeriodStart,
  defaultPeriodEnd,
  userRole,
}: AnalyticsReportViewProps) {
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart)
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd)
  const [sortBy, setSortBy] = useState<'rate' | 'efficiency' | 'code'>('rate')
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false)

  // コストサマリーマップ生成
  const costSummariesMap = useMemo(() => {
    const map: Record<string, any> = {}
    for (const equip of equipment) {
      const maintenanceRecords = maintenanceMap[equip.id] || []
      map[equip.id] = generateEquipmentCostSummary(equip, maintenanceRecords)
    }
    return map
  }, [equipment, maintenanceMap])

  // 分析レポート生成
  const report: AnalyticsReport = useMemo(() => {
    return generateAnalyticsReport(
      equipment,
      usageMap,
      costSummariesMap,
      periodStart,
      periodEnd
    )
  }, [equipment, usageMap, costSummariesMap, periodStart, periodEnd])

  // ソート
  const sortedAnalytics = useMemo(() => {
    return [...report.equipment_analytics].sort((a, b) => {
      if (sortBy === 'rate') {
        return b.operation_rate - a.operation_rate
      } else if (sortBy === 'efficiency') {
        return b.cost_efficiency_score - a.cost_efficiency_score
      } else {
        return a.equipment_code.localeCompare(b.equipment_code)
      }
    })
  }, [report.equipment_analytics, sortBy])

  const handleSetPeriod = (months: number) => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setMonth(today.getMonth() - months)
    setPeriodStart(startDate.toISOString().split('T')[0])
    setPeriodEnd(today.toISOString().split('T')[0])
  }

  // CSVエクスポート
  const exportToCSV = () => {
    const headers = [
      '重機コード',
      '重機名',
      '所有形態',
      '稼働日数',
      '総日数',
      '稼働率(%)',
      '使用回数',
      'コスト効率スコア',
    ]

    const rows = sortedAnalytics.map((analysis) => [
      analysis.equipment_code,
      analysis.equipment_name,
      getOwnershipTypeLabel(analysis.ownership_type),
      analysis.operation_days,
      analysis.total_days,
      analysis.operation_rate,
      analysis.total_usage_count,
      analysis.cost_efficiency_score,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `重機稼働率分析_${periodStart}_${periodEnd}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">

        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              重機の稼働状況と効率性の分析
            </p>
            <div className="hidden sm:flex">
              <button
                onClick={exportToCSV}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                CSVエクスポート
              </button>
            </div>
            <div className="sm:hidden">
              <EquipmentAnalyticsMobileMenu onExport={exportToCSV} />
            </div>
          </div>
        </div>

        {/* 期間選択 - Mobile */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm text-gray-700">
              {periodStart} ～ {periodEnd}
            </div>
            <button
              onClick={() => setIsPeriodModalOpen(true)}
              className="relative p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              aria-label="期間設定"
            >
              <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* 期間選択 - PC */}
        <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">期間設定</h2>
          <div className="flex flex-col gap-4">
            <div className="flex items-end space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  終了日
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSetPeriod(1)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                過去1ヶ月
              </button>
              <button
                onClick={() => handleSetPeriod(3)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                過去3ヶ月
              </button>
              <button
                onClick={() => handleSetPeriod(6)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                過去6ヶ月
              </button>
              <button
                onClick={() => handleSetPeriod(12)}
                className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                過去1年
              </button>
            </div>
          </div>
        </div>
        {/* サマリーカード - モバイル */}
        <div className="grid grid-cols-2 gap-3 sm:hidden mb-6">
          {/* 平均稼働率 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">平均稼働率</div>
            <div className="text-2xl font-bold text-gray-900">{report.average_operation_rate}%</div>
          </div>

          {/* 高稼働率 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">高稼働率重機</div>
            <div className="text-xl font-bold text-gray-900">{report.high_performers_count}台</div>
            <div className="text-xs text-gray-500 mt-1">稼働率80%以上</div>
          </div>

          {/* 低稼働率 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">低稼働率重機</div>
            <div className="text-xl font-bold text-gray-900">{report.low_performers_count}台</div>
            <div className="text-xs text-gray-500 mt-1">稼働率30%以下</div>
          </div>

          {/* 総重機数 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">総重機数</div>
            <div className="text-2xl font-bold text-gray-900">{report.total_equipment_count}台</div>
          </div>
        </div>

        {/* サマリーカード - PC */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* 平均稼働率 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均稼働率</p>
                <p className="text-2xl font-bold text-gray-900">{report.average_operation_rate}%</p>
              </div>
            </div>
          </div>

          {/* 高稼働率 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">高稼働率重機</p>
                <p className="text-2xl font-bold text-gray-900">{report.high_performers_count}台</p>
                <p className="text-xs text-gray-500">稼働率80%以上</p>
              </div>
            </div>
          </div>

          {/* 低稼働率 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">低稼働率重機</p>
                <p className="text-2xl font-bold text-gray-900">{report.low_performers_count}台</p>
                <p className="text-xs text-gray-500">稼働率30%以下</p>
              </div>
            </div>
          </div>

          {/* 総重機数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総重機数</p>
                <p className="text-2xl font-bold text-gray-900">{report.total_equipment_count}台</p>
              </div>
            </div>
          </div>
        </div>

        {/* 所有形態別稼働率 */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">所有形態別稼働率</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 自社所有 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">自社所有</h3>
                <p className="text-3xl font-bold text-blue-600">
                  {report.owned_avg_operation_rate}%
                </p>
                <p className="text-sm text-gray-500 mt-1">平均稼働率</p>
              </div>

              {/* リース */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">リース</h3>
                <p className="text-3xl font-bold text-green-600">
                  {report.leased_avg_operation_rate}%
                </p>
                <p className="text-sm text-gray-500 mt-1">平均稼働率</p>
              </div>

              {/* レンタル */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">レンタル</h3>
                <p className="text-3xl font-bold text-orange-600">
                  {report.rented_avg_operation_rate}%
                </p>
                <p className="text-sm text-gray-500 mt-1">平均稼働率</p>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細テーブル */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">重機別稼働率詳細</h2>
              <div className="flex space-x-2 justify-end sm:justify-start">
                <button
                  onClick={() => setSortBy('rate')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    sortBy === 'rate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  稼働率順
                </button>
                <button
                  onClick={() => setSortBy('efficiency')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    sortBy === 'efficiency'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  効率順
                </button>
                <button
                  onClick={() => setSortBy('code')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    sortBy === 'code'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  コード順
                </button>
              </div>
            </div>
          </div>

          {/* PC用テーブル */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    重機コード
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    重機名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    所有形態
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    稼働日数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    稼働率
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    使用回数
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    効率スコア
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedAnalytics.map((analysis) => (
                  <tr key={analysis.equipment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {analysis.equipment_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {analysis.equipment_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          analysis.ownership_type === 'owned'
                            ? 'bg-blue-100 text-blue-800'
                            : analysis.ownership_type === 'leased'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {getOwnershipTypeLabel(analysis.ownership_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {analysis.operation_days} / {analysis.total_days}日
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-bold text-right ${getOperationRateColor(analysis.operation_rate)}`}>
                      {analysis.operation_rate}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {analysis.total_usage_count}回
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {analysis.cost_efficiency_score}点
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/equipment/${analysis.equipment_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        詳細
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedAnalytics.length === 0 && (
            <div className="hidden sm:block text-center py-12">
              <p className="text-gray-500">分析データがありません</p>
            </div>
          )}

          {/* モバイル用カードビュー */}
          <div className="sm:hidden divide-y divide-gray-200">
            {sortedAnalytics.map((analysis) => (
              <div key={analysis.equipment_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{analysis.equipment_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{analysis.equipment_code}</p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                      analysis.ownership_type === 'owned'
                        ? 'bg-blue-100 text-blue-800'
                        : analysis.ownership_type === 'leased'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {getOwnershipTypeLabel(analysis.ownership_type)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">稼働日数</span>
                    <p className="font-medium text-gray-900">
                      {analysis.operation_days} / {analysis.total_days}日
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">稼働率</span>
                    <p className={`font-bold ${getOperationRateColor(analysis.operation_rate)}`}>
                      {analysis.operation_rate}%
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">使用回数</span>
                    <p className="font-medium text-gray-900">{analysis.total_usage_count}回</p>
                  </div>
                  <div>
                    <span className="text-gray-500">効率スコア</span>
                    <p className="font-semibold text-gray-900">{analysis.cost_efficiency_score}点</p>
                  </div>
                </div>

                <Link
                  href={`/equipment/${analysis.equipment_id}`}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  詳細を見る →
                </Link>
              </div>
            ))}
          </div>

          {sortedAnalytics.length === 0 && (
            <div className="sm:hidden text-center py-12">
              <p className="text-gray-500">分析データがありません</p>
            </div>
          )}
        </div>

        {/* Period Modal */}
        <EquipmentAnalyticsPeriodModal
          isOpen={isPeriodModalOpen}
          onClose={() => setIsPeriodModalOpen(false)}
          periodStart={periodStart}
          periodEnd={periodEnd}
          onPeriodStartChange={setPeriodStart}
          onPeriodEndChange={setPeriodEnd}
          onSetPeriod={handleSetPeriod}
        />
    </div>
  )
}
