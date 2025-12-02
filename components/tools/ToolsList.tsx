'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import ToolFilters from './ToolFilters'

interface FilterState {
  searchQuery: string
  categoryId: string
  managementType: string
  stockStatus: string
}

interface Tool {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  management_type: string
  minimum_stock_level: number | null
  tool_categories?: {
    name: string
  }
  items: any[]
  itemCount: number
  locationCounts: Record<string, number>
  statusCounts: Record<string, number>
}

interface ToolsListProps {
  initialTools: Tool[]
}

export default function ToolsList({ initialTools }: ToolsListProps) {
  const [tools, setTools] = useState<Tool[]>(initialTools)
  const [filteredTools, setFilteredTools] = useState<Tool[]>(initialTools)
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    categoryId: '',
    managementType: '',
    stockStatus: '',
  })

  useEffect(() => {
    // フィルター適用
    let result = [...tools]

    // 道具名検索
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      result = result.filter((tool) =>
        tool.name.toLowerCase().includes(query) ||
        tool.model_number?.toLowerCase().includes(query) ||
        tool.manufacturer?.toLowerCase().includes(query)
      )
    }

    // カテゴリーフィルター
    if (filters.categoryId) {
      // categoryIdには実際にはカテゴリー名が入っている
      result = result.filter((tool) => tool.tool_categories?.name === filters.categoryId)
    }

    // 管理タイプフィルター
    if (filters.managementType) {
      result = result.filter((tool) => tool.management_type === filters.managementType)
    }

    // 在庫状況フィルター
    if (filters.stockStatus) {
      if (filters.stockStatus === 'in_stock') {
        result = result.filter((tool) => {
          if (tool.management_type === 'consumable') {
            // 消耗品の場合は最小在庫レベルと比較
            const availableCount = tool.statusCounts.available || 0
            const minimumLevel = tool.minimum_stock_level || 0
            return availableCount >= minimumLevel
          } else {
            // 個別管理の場合は利用可能な台数があるか
            return (tool.statusCounts.available || 0) > 0
          }
        })
      } else if (filters.stockStatus === 'low_stock') {
        result = result.filter((tool) => {
          if (tool.management_type === 'consumable') {
            // 消耗品の場合は最小在庫レベルより少ない
            const availableCount = tool.statusCounts.available || 0
            const minimumLevel = tool.minimum_stock_level || 0
            return availableCount < minimumLevel
          } else {
            // 個別管理の場合は利用可能な台数が0
            return (tool.statusCounts.available || 0) === 0
          }
        })
      }
    }

    setFilteredTools(result)
  }, [tools, filters])

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters)
  }

  return (
    <>
      <ToolFilters onFilterChange={handleFilterChange} />

      {/* 結果件数表示 */}
      <div className="mb-4 text-sm text-gray-600">
        {filteredTools.length}件の道具
        {filteredTools.length !== tools.length && (
          <span className="ml-2">
            (全{tools.length}件中)
          </span>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredTools && filteredTools.length > 0 ? (
          <ul className="divide-y divide-gray-200">
            {filteredTools.map((tool) => (
              <li key={tool.id}>
                <Link
                  href={`/tools/${tool.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-600 truncate">
                          {tool.name}
                        </p>
                        <div className="mt-2 flex items-center text-sm text-gray-500 flex-wrap gap-x-4 gap-y-1">
                          {tool.model_number && (
                            <span>型番: {tool.model_number}</span>
                          )}
                          {tool.manufacturer && (
                            <span>メーカー: {tool.manufacturer}</span>
                          )}
                          <span>
                            管理タイプ: {tool.management_type === 'consumable' ? '消耗品' : '個別管理'}
                          </span>
                          <span>
                            {tool.management_type === 'consumable'
                              ? `在庫数: ${tool.statusCounts.available || 0}${tool.minimum_stock_level ? ` (最小: ${tool.minimum_stock_level})` : ''}`
                              : `合計: ${tool.itemCount}台`}
                          </span>
                        </div>
                        {tool.management_type === 'individual' && (
                          <div className="mt-1 flex items-center text-xs text-gray-400 flex-wrap gap-x-3">
                            {tool.locationCounts.warehouse > 0 && (
                              <span>📦 倉庫: {tool.locationCounts.warehouse}</span>
                            )}
                            {tool.locationCounts.site > 0 && (
                              <span>🏗️ 現場: {tool.locationCounts.site}</span>
                            )}
                            {tool.locationCounts.repair > 0 && (
                              <span>🔧 修理中: {tool.locationCounts.repair}</span>
                            )}
                            {tool.locationCounts.lost > 0 && (
                              <span className="text-red-500">
                                ❌ 紛失: {tool.locationCounts.lost}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          {tool.statusCounts.available > 0 && (
                            <div className="text-xs text-green-600">
                              利用可能: {tool.statusCounts.available}
                            </div>
                          )}
                          {tool.statusCounts.in_use > 0 && (
                            <div className="text-xs text-blue-600">
                              使用中: {tool.statusCounts.in_use}
                            </div>
                          )}
                          {tool.statusCounts.maintenance > 0 && (
                            <div className="text-xs text-yellow-600">
                              メンテ: {tool.statusCounts.maintenance}
                            </div>
                          )}
                          {/* 在庫不足警告 */}
                          {tool.management_type === 'consumable' &&
                            tool.minimum_stock_level &&
                            (tool.statusCounts.available || 0) < tool.minimum_stock_level && (
                              <div className="text-xs text-red-600 font-semibold">
                                ⚠️ 在庫不足
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {tools.length === 0
                ? '登録されている道具がありません'
                : '検索条件に一致する道具がありません'}
            </p>
            {tools.length === 0 && (
              <Link
                href="/tools/new"
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                最初の道具を登録する
              </Link>
            )}
          </div>
        )}
      </div>
    </>
  )
}
