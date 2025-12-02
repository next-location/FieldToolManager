'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FilterState {
  searchQuery: string
  categoryId: string
  managementType: string
  stockStatus: string
}

interface ToolFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

interface Category {
  id: string
  name: string
}

export default function ToolFilters({ onFilterChange }: ToolFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    categoryId: '',
    managementType: '',
    stockStatus: '',
  })

  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    // カテゴリー一覧を取得
    const fetchCategories = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('tool_categories')
        .select('id, name')
        .order('name')

      if (data) {
        setCategories(data)
      }
    }

    fetchCategories()
  }, [])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const resetFilters = {
      searchQuery: '',
      categoryId: '',
      managementType: '',
      stockStatus: '',
    }
    setFilters(resetFilters)
    onFilterChange(resetFilters)
  }

  const hasActiveFilters =
    filters.searchQuery ||
    filters.categoryId ||
    filters.managementType ||
    filters.stockStatus

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 道具名検索 */}
        <div>
          <label
            htmlFor="search"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            道具名
          </label>
          <input
            type="text"
            id="search"
            value={filters.searchQuery}
            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
            placeholder="道具名で検索..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* カテゴリーフィルター */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            カテゴリー
          </label>
          <select
            id="category"
            value={filters.categoryId}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべて</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* 管理タイプフィルター */}
        <div>
          <label
            htmlFor="managementType"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            管理タイプ
          </label>
          <select
            id="managementType"
            value={filters.managementType}
            onChange={(e) => handleFilterChange('managementType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべて</option>
            <option value="individual">個別管理</option>
            <option value="consumable">消耗品</option>
          </select>
        </div>

        {/* 在庫状況フィルター */}
        <div>
          <label
            htmlFor="stockStatus"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            在庫状況
          </label>
          <select
            id="stockStatus"
            value={filters.stockStatus}
            onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべて</option>
            <option value="in_stock">在庫あり</option>
            <option value="low_stock">在庫不足</option>
          </select>
        </div>
      </div>

      {/* アクティブなフィルターの表示 */}
      {hasActiveFilters && (
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="text-sm text-gray-500">適用中:</span>
          {filters.searchQuery && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              検索: {filters.searchQuery}
              <button
                onClick={() => handleFilterChange('searchQuery', '')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.categoryId && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              カテゴリー: {filters.categoryId}
              <button
                onClick={() => handleFilterChange('categoryId', '')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.managementType && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {filters.managementType === 'individual' ? '個別管理' : '消耗品'}
              <button
                onClick={() => handleFilterChange('managementType', '')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.stockStatus && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {filters.stockStatus === 'in_stock' ? '在庫あり' : '在庫不足'}
              <button
                onClick={() => handleFilterChange('stockStatus', '')}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-yellow-200"
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
