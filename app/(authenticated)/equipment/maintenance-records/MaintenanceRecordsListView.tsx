'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/equipment-cost'

interface Equipment {
  id: string
  equipment_code: string
  name: string
}

interface MaintenanceRecord {
  id: string
  equipment_id: string
  maintenance_type: 'vehicle_inspection' | 'insurance_renewal' | 'repair' | 'other'
  maintenance_date: string
  performed_by: string | null
  cost: number | null
  next_date: string | null
  notes: string | null
  heavy_equipment: {
    id: string
    equipment_code: string
    name: string
    ownership_type: string
  }
}

interface MaintenanceRecordsListViewProps {
  equipment: Equipment[]
  maintenanceRecords: MaintenanceRecord[]
  userRole: string
}

export default function MaintenanceRecordsListView({
  equipment,
  maintenanceRecords,
  userRole,
}: MaintenanceRecordsListViewProps) {
  const [selectedEquipment, setSelectedEquipment] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'cost'>('date')

  // 点検タイプのラベル
  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle_inspection':
        return '車検'
      case 'insurance_renewal':
        return '保険更新'
      case 'repair':
        return '修理'
      case 'other':
        return 'その他'
      default:
        return type
    }
  }

  // 点検タイプの色
  const getMaintenanceTypeColor = (type: string) => {
    switch (type) {
      case 'vehicle_inspection':
        return 'bg-purple-100 text-purple-800'
      case 'insurance_renewal':
        return 'bg-blue-100 text-blue-800'
      case 'repair':
        return 'bg-red-100 text-red-800'
      case 'other':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // フィルタリングとソート
  const filteredAndSortedRecords = useMemo(() => {
    let filtered = maintenanceRecords

    // 重機でフィルタ
    if (selectedEquipment !== 'all') {
      filtered = filtered.filter((r) => r.equipment_id === selectedEquipment)
    }

    // 点検タイプでフィルタ
    if (selectedType !== 'all') {
      filtered = filtered.filter((r) => r.maintenance_type === selectedType)
    }

    // ソート
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.maintenance_date).getTime() - new Date(a.maintenance_date).getTime()
      } else {
        return (b.cost || 0) - (a.cost || 0)
      }
    })

    return sorted
  }, [maintenanceRecords, selectedEquipment, selectedType, sortBy])

  // 統計情報
  const stats = useMemo(() => {
    const totalCost = filteredAndSortedRecords.reduce((sum, r) => sum + (r.cost || 0), 0)
    const avgCost = filteredAndSortedRecords.length > 0 ? totalCost / filteredAndSortedRecords.length : 0

    return {
      totalRecords: filteredAndSortedRecords.length,
      totalCost,
      avgCost,
    }
  }, [filteredAndSortedRecords])

  // 次回期限が近い警告（30日以内）
  const getNextDateWarning = (nextDate: string | null) => {
    if (!nextDate) return null

    const today = new Date()
    const next = new Date(nextDate)
    const diffDays = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { type: 'expired', label: '期限切れ', color: 'text-red-600' }
    } else if (diffDays <= 30) {
      return { type: 'warning', label: `残り${diffDays}日`, color: 'text-orange-600' }
    }
    return null
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">点検記録一覧</h1>
          <p className="mt-2 text-sm text-gray-600">
            重機の点検・車検・保険更新・修理の履歴を管理できます
          </p>
        </div>

        {/* 統計サマリー - モバイル */}
        <div className="grid grid-cols-3 gap-3 sm:hidden mb-6">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">記録数</div>
            <div className="text-lg font-bold text-gray-900">{stats.totalRecords}件</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">総費用</div>
            <div className="text-sm font-bold text-gray-900">{formatCurrency(stats.totalCost)}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-3">
            <div className="text-xs font-medium text-gray-500 mb-1">平均</div>
            <div className="text-sm font-bold text-gray-900">{formatCurrency(Math.round(stats.avgCost))}</div>
          </div>
        </div>

        {/* 統計サマリー - PC */}
        <div className="hidden sm:grid sm:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総記録数</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRecords}件</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">総費用</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalCost)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">平均費用</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(Math.round(stats.avgCost))}</p>
              </div>
            </div>
          </div>
        </div>

        {/* フィルタとソート */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 重機フィルタ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">重機</label>
              <select
                value={selectedEquipment}
                onChange={(e) => setSelectedEquipment(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">すべて</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.equipment_code} - {eq.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 点検タイプフィルタ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">点検タイプ</label>
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">すべて</option>
                <option value="vehicle_inspection">車検</option>
                <option value="insurance_renewal">保険更新</option>
                <option value="repair">修理</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* ソート */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">並び順</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'cost')}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="date">実施日順</option>
                <option value="cost">費用順</option>
              </select>
            </div>
          </div>
        </div>

        {/* テーブル - PC */}
        <div className="hidden sm:block bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実施日
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  重機
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  実施者
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  費用
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  次回予定
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  アクション
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedRecords.map((record) => {
                const warning = getNextDateWarning(record.next_date)
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.maintenance_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {record.heavy_equipment.name}
                      </div>
                      <div className="text-xs text-gray-500">{record.heavy_equipment.equipment_code}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded ${getMaintenanceTypeColor(record.maintenance_type)}`}
                      >
                        {getMaintenanceTypeLabel(record.maintenance_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {record.performed_by || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {record.cost ? formatCurrency(record.cost) : '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {record.next_date ? (
                        <div>
                          <div className="text-gray-900">
                            {new Date(record.next_date).toLocaleDateString('ja-JP')}
                          </div>
                          {warning && <div className={`text-xs font-semibold ${warning.color}`}>{warning.label}</div>}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/equipment/${record.equipment_id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        重機詳細
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredAndSortedRecords.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">点検記録がありません</p>
            </div>
          )}
        </div>

        {/* カードビュー - モバイル */}
        <div className="sm:hidden space-y-4">
          {filteredAndSortedRecords.map((record) => {
            const warning = getNextDateWarning(record.next_date)
            return (
              <div key={record.id} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{record.heavy_equipment.name}</h3>
                    <p className="text-sm text-gray-500">{record.heavy_equipment.equipment_code}</p>
                  </div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${getMaintenanceTypeColor(record.maintenance_type)}`}
                  >
                    {getMaintenanceTypeLabel(record.maintenance_type)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  <div>
                    <span className="text-gray-500">実施日</span>
                    <p className="font-medium text-gray-900">
                      {new Date(record.maintenance_date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">費用</span>
                    <p className="font-medium text-gray-900">
                      {record.cost ? formatCurrency(record.cost) : '—'}
                    </p>
                  </div>
                  {record.next_date && (
                    <div className="col-span-2">
                      <span className="text-gray-500">次回予定</span>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">
                          {new Date(record.next_date).toLocaleDateString('ja-JP')}
                        </p>
                        {warning && <span className={`text-xs font-semibold ${warning.color}`}>{warning.label}</span>}
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  href={`/equipment/${record.equipment_id}`}
                  className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                >
                  重機詳細を見る →
                </Link>
              </div>
            )
          })}

          {filteredAndSortedRecords.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500">点検記録がありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
