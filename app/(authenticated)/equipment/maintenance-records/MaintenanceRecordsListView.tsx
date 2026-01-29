'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { SlidersHorizontal } from 'lucide-react'
import { formatCurrency } from '@/lib/equipment-cost'
import MaintenanceFiltersModal from './MaintenanceFiltersModal'

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

// ひらがな→カタカナ変換
const toKatakana = (str: string) => {
  return str.replace(/[\u3041-\u3096]/g, (match) => {
    const chr = match.charCodeAt(0) + 0x60
    return String.fromCharCode(chr)
  })
}

// カタカナ→ひらがな変換
const toHiragana = (str: string) => {
  return str.replace(/[\u30a1-\u30f6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

export default function MaintenanceRecordsListView({
  equipment,
  maintenanceRecords,
  userRole,
}: MaintenanceRecordsListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'date' | 'cost'>('date')
  const [isModalOpen, setIsModalOpen] = useState(false)

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

    // 重機検索（ひらがな・カタカナ両対応）
    if (searchQuery) {
      const queryKatakana = toKatakana(searchQuery.toLowerCase())
      const queryHiragana = toHiragana(searchQuery.toLowerCase())

      filtered = filtered.filter((r) => {
        const nameKatakana = toKatakana(r.heavy_equipment.name.toLowerCase())
        const nameHiragana = toHiragana(r.heavy_equipment.name.toLowerCase())
        const code = r.heavy_equipment.equipment_code.toLowerCase()

        return (
          nameKatakana.includes(queryKatakana) ||
          nameHiragana.includes(queryHiragana) ||
          nameKatakana.includes(queryHiragana) ||
          nameHiragana.includes(queryKatakana) ||
          r.heavy_equipment.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          code.includes(searchQuery.toLowerCase())
        )
      })
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
  }, [maintenanceRecords, searchQuery, selectedType, sortBy])

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

  const handleReset = () => {
    setSearchQuery('')
    setSelectedType('all')
    setSortBy('date')
  }

  const hasActiveFilters = searchQuery || selectedType !== 'all' || sortBy !== 'date'
  const filterCount = [selectedType !== 'all' ? 1 : 0, sortBy !== 'date' ? 1 : 0].reduce((a, b) => a + b, 0)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        {/* ヘッダー */}
        <div className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">修理・点検記録一覧</h1>
            <p className="mt-2 text-sm text-gray-600">
              重機の点検・車検・保険更新・修理の履歴を管理できます
            </p>
          </div>
          <Link
            href="/equipment/maintenance-records/new"
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm font-medium"
          >
            + 新規登録
          </Link>
        </div>

        {/* フィルタ - Mobile */}
        <div className="sm:hidden mb-6">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="重機名、コード..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            <button
              onClick={() => setIsModalOpen(true)}
              className="relative p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              aria-label="フィルター"
            >
              <SlidersHorizontal className="h-5 w-5 text-gray-600" />
              {filterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {filterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* フィルタ - PC */}
        <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
            {hasActiveFilters && (
              <button
                onClick={handleReset}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                クリア
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 重機検索 */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                重機検索
              </label>
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="重機名、コード..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* 点検タイプ */}
            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                点検タイプ
              </label>
              <select
                id="type"
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">すべて</option>
                <option value="vehicle_inspection">車検</option>
                <option value="insurance_renewal">保険更新</option>
                <option value="repair">修理</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* 並び順 */}
            <div>
              <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-1">
                並び順
              </label>
              <select
                id="sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'cost')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="date">実施日順</option>
                <option value="cost">費用順</option>
              </select>
            </div>
          </div>

          {/* アクティブなフィルターの表示 */}
          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500">適用中:</span>
              {searchQuery && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  検索: {searchQuery}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                  >
                    ×
                  </button>
                </span>
              )}
              {selectedType !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  タイプ: {getMaintenanceTypeLabel(selectedType)}
                  <button
                    onClick={() => setSelectedType('all')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
                  >
                    ×
                  </button>
                </span>
              )}
              {sortBy !== 'date' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  並び: 費用順
                  <button
                    onClick={() => setSortBy('date')}
                    className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
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

      {/* Filter Modal */}
      <MaintenanceFiltersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedType={selectedType}
        sortBy={sortBy}
        onTypeChange={setSelectedType}
        onSortChange={setSortBy}
        onReset={handleReset}
      />
    </div>
  )
}
