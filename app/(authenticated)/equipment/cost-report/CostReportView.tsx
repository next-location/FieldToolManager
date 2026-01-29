'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import type { HeavyEquipment, HeavyEquipmentMaintenance, CostReport } from '@/types/heavy-equipment'
import {
  generateCostReport,
  formatCurrency,
  getOwnershipTypeLabel,
} from '@/lib/equipment-cost'
import EquipmentCostReportMobileMenu from '@/components/equipment/EquipmentCostReportMobileMenu'
import CostReportPeriodModal from '@/components/equipment/CostReportPeriodModal'

interface CostReportViewProps {
  equipment: HeavyEquipment[]
  maintenanceMap: Record<string, HeavyEquipmentMaintenance[]>
  defaultPeriodStart: string
  defaultPeriodEnd: string
  userRole: string
}

export default function CostReportView({
  equipment,
  maintenanceMap,
  defaultPeriodStart,
  defaultPeriodEnd,
  userRole,
}: CostReportViewProps) {
  const [periodStart, setPeriodStart] = useState(defaultPeriodStart)
  const [periodEnd, setPeriodEnd] = useState(defaultPeriodEnd)
  const [sortBy, setSortBy] = useState<'code' | 'cost'>('cost')
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false)

  // コストレポート生成（期間に基づいて動的に計算）
  const report: CostReport = useMemo(() => {
    return generateCostReport(
      equipment,
      maintenanceMap,
      periodStart,
      periodEnd
    )
  }, [equipment, maintenanceMap, periodStart, periodEnd])

  // ソート
  const sortedDetails = useMemo(() => {
    return [...report.equipment_details].sort((a, b) => {
      if (sortBy === 'cost') {
        // 選択期間の総コストでソート
        return b.total_cost_this_year - a.total_cost_this_year
      }
      return a.equipment_code.localeCompare(b.equipment_code)
    })
  }, [report.equipment_details, sortBy])

  // CSVエクスポート
  const exportToCSV = () => {
    const headers = [
      '重機コード',
      '重機名',
      '所有形態',
      '月額/簿価',
      '期間点検費',
      '期間総コスト',
    ]

    const rows = sortedDetails.map((detail) => {
      const monthlyOrBookValue = detail.ownership_type === 'owned' ? detail.book_value : detail.monthly_cost

      return [
        detail.equipment_code,
        detail.equipment_name,
        getOwnershipTypeLabel(detail.ownership_type),
        monthlyOrBookValue || 0,
        detail.maintenance_cost_this_year,
        detail.total_cost_this_year,
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `重機コストレポート_${periodStart}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleSetPeriod = (months: number) => {
    const today = new Date()
    const startDate = new Date(today)
    startDate.setMonth(today.getMonth() - months)
    setPeriodStart(startDate.toISOString().split('T')[0])
    setPeriodEnd(today.toISOString().split('T')[0])
  }

  return (
    <div className="space-y-6">

        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">重機のコスト状況と期間別集計</p>
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
              <EquipmentCostReportMobileMenu onExport={exportToCSV} />
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
            <div className="flex flex-wrap gap-2">
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
          {/* 総重機数 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">総重機数</div>
            <div className="text-2xl font-bold text-gray-900">{report.total_equipment_count}台</div>
          </div>

          {/* 月額コスト */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">月額コスト</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(report.total_monthly_cost)}</div>
          </div>

          {/* 期間コスト */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">期間コスト</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(report.total_annual_cost)}</div>
          </div>

          {/* 点検・修理費 */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm font-medium text-gray-500 mb-1">期間点検・修理費</div>
            <div className="text-xl font-bold text-gray-900">{formatCurrency(report.total_maintenance_cost)}</div>
          </div>
        </div>

        {/* サマリーカード - PC */}
        <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 総重機数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総重機数</p>
                <p className="text-2xl font-bold text-gray-900">{report.total_equipment_count}台</p>
              </div>
            </div>
          </div>

          {/* 月額コスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">月額コスト</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.total_monthly_cost)}</p>
              </div>
            </div>
          </div>

          {/* 期間コスト */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-orange-100 rounded-md p-3">
                <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">期間コスト</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.total_annual_cost)}</p>
              </div>
            </div>
          </div>

          {/* 点検・修理費 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div className="ml-4 min-w-0">
                <p className="text-sm font-medium text-gray-500 whitespace-nowrap">期間メンテナンス費</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(report.total_maintenance_cost)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 所有形態別サマリー */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">所有形態別コスト</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 自社所有 */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">自社所有</h3>
                  <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                    {report.owned_equipment_count}台
                  </span>
                </div>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">資産価値（簿価）</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(report.owned_equipment_value)}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">期間点検費</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(report.owned_maintenance_cost)}</dd>
                  </div>
                </dl>
              </div>

              {/* リース */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">リース</h3>
                  <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 rounded">
                    {report.leased_equipment_count}台
                  </span>
                </div>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">月額合計</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(report.leased_monthly_cost)}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">期間コスト</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(report.leased_annual_cost)}</dd>
                  </div>
                </dl>
              </div>

              {/* レンタル */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">レンタル</h3>
                  <span className="px-2 py-1 text-xs font-semibold bg-orange-100 text-orange-800 rounded">
                    {report.rented_equipment_count}台
                  </span>
                </div>
                <dl className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">月額合計</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(report.rented_monthly_cost)}</dd>
                  </div>
                  <div className="flex justify-between text-sm">
                    <dt className="text-gray-500">期間コスト</dt>
                    <dd className="font-medium text-gray-900">{formatCurrency(report.rented_annual_cost)}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 詳細テーブル */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">重機別コスト詳細</h2>
              {/* ソート切り替え */}
              <div className="flex space-x-2 justify-end sm:justify-start">
                <button
                  onClick={() => setSortBy('cost')}
                  className={`px-3 py-1 text-sm font-medium rounded ${
                    sortBy === 'cost'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  コスト順
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
                    月額/簿価
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    点検費
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    合計コスト
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedDetails.map((detail) => (
                  <tr key={detail.equipment_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {detail.equipment_code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {detail.equipment_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${
                          detail.ownership_type === 'owned'
                            ? 'bg-blue-100 text-blue-800'
                            : detail.ownership_type === 'leased'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {getOwnershipTypeLabel(detail.ownership_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {detail.ownership_type === 'owned'
                        ? formatCurrency(detail.book_value)
                        : formatCurrency(detail.monthly_cost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(detail.maintenance_cost_this_year)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                      {formatCurrency(detail.total_cost_this_year)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/equipment/${detail.equipment_id}`}
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

          {sortedDetails.length === 0 && (
            <div className="hidden sm:block text-center py-12">
              <p className="text-gray-500">コストデータがありません</p>
            </div>
          )}

          {/* モバイル用カードビュー */}
          <div className="sm:hidden divide-y divide-gray-200">
            {sortedDetails.map((detail) => (
              <div key={detail.equipment_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{detail.equipment_name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{detail.equipment_code}</p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                      detail.ownership_type === 'owned'
                        ? 'bg-blue-100 text-blue-800'
                        : detail.ownership_type === 'leased'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}
                  >
                    {getOwnershipTypeLabel(detail.ownership_type)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">月額/簿価</span>
                    <p className="font-medium text-gray-900">
                      {detail.ownership_type === 'owned'
                        ? formatCurrency(detail.book_value)
                        : formatCurrency(detail.monthly_cost)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">期間点検費</span>
                    <p className="font-medium text-gray-900">{formatCurrency(detail.maintenance_cost_this_year)}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">期間総コスト</span>
                    <p className="font-semibold text-gray-900 text-lg">{formatCurrency(detail.total_cost_this_year)}</p>
                  </div>
                </div>

                <Link
                  href={`/equipment/${detail.equipment_id}`}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  詳細を見る →
                </Link>
              </div>
            ))}
          </div>

          {sortedDetails.length === 0 && (
            <div className="sm:hidden text-center py-12">
              <p className="text-gray-500">コストデータがありません</p>
            </div>
          )}
        </div>

        {/* Period Modal */}
        <CostReportPeriodModal
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
