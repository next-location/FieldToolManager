'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import EquipmentFilters from './EquipmentFilters'
import type { HeavyEquipment } from '@/types/heavy-equipment'

interface FilterState {
  searchQuery: string
  categoryId: string
  ownershipType: string
  status: string
}

interface EquipmentWithRelations extends HeavyEquipment {
  heavy_equipment_categories?: {
    name: string
    icon: string
  }
  sites?: {
    name: string
  }
  users?: {
    name: string
  }
}

interface EquipmentListProps {
  initialEquipment: EquipmentWithRelations[]
  organizationSettings: any
}

export default function EquipmentList({ initialEquipment, organizationSettings }: EquipmentListProps) {
  const [equipment, setEquipment] = useState<EquipmentWithRelations[]>(initialEquipment)
  const [filteredEquipment, setFilteredEquipment] = useState<EquipmentWithRelations[]>(initialEquipment)
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    categoryId: '',
    ownershipType: '',
    status: '',
  })

  useEffect(() => {
    // フィルター適用
    let result = [...equipment]

    // 重機名・コード検索
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter((equip) =>
        equip.name.toLowerCase().includes(query) ||
        equip.equipment_code.toLowerCase().includes(query) ||
        equip.model_number?.toLowerCase().includes(query) ||
        equip.manufacturer?.toLowerCase().includes(query) ||
        equip.registration_number?.toLowerCase().includes(query)
      )
    }

    // カテゴリーフィルター
    if (filters.categoryId) {
      result = result.filter((equip) => equip.category_id === filters.categoryId)
    }

    // 所有形態フィルター
    if (filters.ownershipType) {
      result = result.filter((equip) => equip.ownership_type === filters.ownershipType)
    }

    // ステータスフィルター
    if (filters.status) {
      result = result.filter((equip) => equip.status === filters.status)
    }

    setFilteredEquipment(result)
  }, [equipment, filters])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  // 所有形態ラベル
  const getOwnershipLabel = (type: string) => {
    switch (type) {
      case 'owned':
        return '自社所有'
      case 'leased':
        return 'リース'
      case 'rented':
        return 'レンタル'
      default:
        return type
    }
  }

  // ステータスラベルとカラー
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">利用可能</span>
      case 'in_use':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">使用中</span>
      case 'maintenance':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">点検中</span>
      case 'out_of_service':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">使用不可</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  // 車検・保険アラート判定
  const getAlerts = (equip: EquipmentWithRelations) => {
    const alerts: string[] = []
    const today = new Date()

    if (equip.requires_vehicle_inspection && equip.vehicle_inspection_date) {
      const inspectionDate = new Date(equip.vehicle_inspection_date)
      const daysUntil = Math.floor((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil < 0) {
        alerts.push('🔴 車検期限切れ')
      } else if (daysUntil <= 30) {
        alerts.push('🟡 車検期限間近')
      }
    }

    if (equip.insurance_end_date) {
      const insuranceDate = new Date(equip.insurance_end_date)
      const daysUntil = Math.floor((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil < 0) {
        alerts.push('🔴 保険期限切れ')
      } else if (daysUntil <= 30) {
        alerts.push('🟡 保険期限間近')
      }
    }

    return alerts
  }

  return (
    <>
      <EquipmentFilters
        onFilterChange={handleFilterChange}
        categories={equipment}
      />

      {/* 結果件数表示 */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredEquipment.length}件の重機
        {filteredEquipment.length !== equipment.length && (
          <span className="ml-2">
            (全{equipment.length}件中)
          </span>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredEquipment && filteredEquipment.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredEquipment.map((equip) => {
              const alerts = getAlerts(equip)
              return (
                <li key={equip.id}>
                  <Link
                    href={`/equipment/${equip.id}`}
                    className="block hover:bg-gray-50 transition-colors"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {equip.name}
                            </p>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                              {equip.equipment_code}
                            </span>
                            {getStatusBadge(equip.status)}
                          </div>

                          <div className="mt-2 flex items-center text-sm text-gray-500 flex-wrap gap-x-4 gap-y-1">
                            {equip.heavy_equipment_categories && (
                              <span>
                                カテゴリ: {equip.heavy_equipment_categories.name}
                              </span>
                            )}
                            <span className="font-medium text-gray-700">
                              {getOwnershipLabel(equip.ownership_type)}
                            </span>
                            {equip.manufacturer && (
                              <span>メーカー: {equip.manufacturer}</span>
                            )}
                            {equip.model_number && (
                              <span>型番: {equip.model_number}</span>
                            )}
                            {equip.registration_number && (
                              <span>登録番号: {equip.registration_number}</span>
                            )}
                          </div>

                          {/* 現在地・使用者 */}
                          <div className="mt-2 flex items-center text-sm text-gray-500 gap-x-4">
                            {equip.sites && (
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                {equip.sites.name}
                              </span>
                            )}
                            {equip.users && (
                              <span className="flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {equip.users.name}
                              </span>
                            )}
                          </div>

                          {/* アラート表示 */}
                          {alerts.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              {alerts.map((alert, idx) => (
                                <span key={idx} className="text-xs font-medium">
                                  {alert}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <div className="text-center py-12">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">重機が登録されていません</h3>
            <p className="mt-1 text-sm text-gray-500">
              新しい重機を登録して管理を始めましょう
            </p>
          </div>
        )}
      </div>
    </>
  )
}
