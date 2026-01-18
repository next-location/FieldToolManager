'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ConsumablesFilters from './ConsumablesFilters'

interface FilterState {
  searchQuery: string
  stockStatus: string
}

interface Consumable {
  id: string
  name: string
  model_number: string | null
  unit: string
  minimum_stock: number
  warehouse_quantity: number
  site_quantity: number
  total_quantity: number
  is_low_stock: boolean
  tool_categories?: {
    name: string
  }
}

interface ConsumablesListProps {
  initialConsumables: Consumable[]
  userRole: string
}

export default function ConsumablesList({ initialConsumables, userRole }: ConsumablesListProps) {
  const isManagerOrAbove = userRole === 'manager' || userRole === 'admin'

  const [consumables, setConsumables] = useState<Consumable[]>(initialConsumables)
  const [filteredConsumables, setFilteredConsumables] = useState<Consumable[]>(initialConsumables)
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    stockStatus: '',
  })

  useEffect(() => {
    // フィルター適用
    let result = [...consumables]

    // 消耗品名検索
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter((consumable) =>
        consumable.name.toLowerCase().includes(query) ||
        consumable.model_number?.toLowerCase().includes(query)
      )
    }

    // 在庫状況フィルター
    if (filters.stockStatus) {
      if (filters.stockStatus === 'in_stock') {
        result = result.filter((consumable) => !consumable.is_low_stock)
      } else if (filters.stockStatus === 'low_stock') {
        result = result.filter((consumable) => consumable.is_low_stock)
      }
    }

    setFilteredConsumables(result)
  }, [consumables, filters])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  return (
    <>
      <ConsumablesFilters onFilterChange={handleFilterChange} />

      {/* 結果件数表示 */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredConsumables.length}件の消耗品
        {filteredConsumables.length !== consumables.length && (
          <span className="ml-2">
            (全{consumables.length}件中)
          </span>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredConsumables && filteredConsumables.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredConsumables.map((consumable) => (
              <li key={consumable.id}>
                <div className="px-4 py-4 sm:px-6">
                  {/* スマホ: 縦並び、PC: 横並び */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    {/* 左側: 消耗品情報 */}
                    <Link
                      href={`/consumables/${consumable.id}`}
                      className="flex-1 hover:text-blue-700 min-w-0"
                    >
                      <div className="flex items-center flex-wrap gap-2 mb-3">
                        <p className="text-lg sm:text-sm font-bold sm:font-medium text-blue-600">
                          {consumable.name}
                        </p>
                        {consumable.is_low_stock && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            在庫不足
                          </span>
                        )}
                      </div>

                      {/* スマホ: 在庫情報を大きく表示 */}
                      <div className="sm:hidden space-y-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs text-gray-500">合計在庫</span>
                          <span className="text-2xl font-bold text-gray-900">
                            {consumable.total_quantity}
                          </span>
                          <span className="text-sm text-gray-600">{consumable.unit}</span>
                        </div>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs text-gray-500">倉庫</span>
                            <span className="text-lg font-semibold text-gray-700">
                              {consumable.warehouse_quantity}
                            </span>
                            <span className="text-xs text-gray-500">{consumable.unit}</span>
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-xs text-gray-500">現場</span>
                            <span className="text-lg font-semibold text-gray-700">
                              {consumable.site_quantity}
                            </span>
                            <span className="text-xs text-gray-500">{consumable.unit}</span>
                          </div>
                        </div>
                        {consumable.model_number && (
                          <div className="text-xs text-gray-500 pt-1">
                            型番: {consumable.model_number}
                          </div>
                        )}
                        <div className="text-xs text-gray-500">
                          最小在庫: {consumable.minimum_stock}{consumable.unit}
                        </div>
                      </div>

                      {/* PC: 従来通りの表示 */}
                      <div className="hidden sm:block">
                        <div className="mt-2 flex items-center text-sm text-gray-500 gap-x-4">
                          {consumable.model_number && (
                            <span>型番: {consumable.model_number}</span>
                          )}
                          <span>単位: {consumable.unit}</span>
                          <span>最小在庫: {consumable.minimum_stock}{consumable.unit}</span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-700 gap-x-4">
                          <span className="font-medium">
                            合計在庫: {consumable.total_quantity}{consumable.unit}
                          </span>
                          <span>
                            倉庫: {consumable.warehouse_quantity}{consumable.unit}
                          </span>
                          <span>
                            現場: {consumable.site_quantity}{consumable.unit}
                          </span>
                        </div>
                      </div>
                    </Link>

                    {/* 右側: アクションボタン */}
                    {isManagerOrAbove && (
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 sm:ml-4 shrink-0">
                        <Link
                          href={`/consumables/${consumable.id}/adjust`}
                          className="inline-flex items-center justify-center px-4 py-2.5 sm:px-4 sm:py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50 whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          📦 在庫調整
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-4 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              消耗品が見つかりません
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              検索条件を変更するか、新しい消耗品を登録してください
            </p>
          </div>
        )}
      </div>
    </>
  )
}
