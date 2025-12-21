'use client'

import { useState, useEffect } from 'react'
import type { HeavyEquipment } from '@/types/heavy-equipment'

interface FilterState {
  searchQuery: string
  categoryId: string
  ownershipType: string
  status: string
}

interface EquipmentWithCategory extends HeavyEquipment {
  heavy_equipment_categories?: {
    name: string
    icon: string
  }
}

interface EquipmentFiltersProps {
  onFilterChange: (filters: FilterState) => void
  categories: EquipmentWithCategory[]
}

export default function EquipmentFilters({ onFilterChange, categories }: EquipmentFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    categoryId: '',
    ownershipType: '',
    status: '',
  })

  // カテゴリー一覧を抽出（重複除去）
  const uniqueCategories = Array.from(
    new Map(
      categories
        .filter(e => e.heavy_equipment_categories)
        .map(e => [e.category_id, e.heavy_equipment_categories])
    ).values()
  )

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, searchQuery: e.target.value })
  }

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, categoryId: e.target.value })
  }

  const handleOwnershipChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, ownershipType: e.target.value })
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ ...filters, status: e.target.value })
  }

  const handleReset = () => {
    setFilters({
      searchQuery: '',
      categoryId: '',
      ownershipType: '',
      status: '',
    })
  }

  const hasActiveFilters =
    filters.searchQuery ||
    filters.categoryId ||
    filters.ownershipType ||
    filters.status

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
        {/* 検索 */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            type="text"
            id="search"
            value={filters.searchQuery}
            onChange={handleSearchChange}
            placeholder="重機名、コード、型番..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>

        {/* カテゴリー */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリー
          </label>
          <select
            id="category"
            value={filters.categoryId}
            onChange={handleCategoryChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべて</option>
            {uniqueCategories.map((cat) => (
              <option key={cat?.name} value={categories.find(e => e.heavy_equipment_categories?.name === cat?.name)?.category_id || ''}>
                {cat?.name}
              </option>
            ))}
          </select>
        </div>

        {/* 所有形態 */}
        <div>
          <label htmlFor="ownership" className="block text-sm font-medium text-gray-700 mb-1">
            所有形態
          </label>
          <select
            id="ownership"
            value={filters.ownershipType}
            onChange={handleOwnershipChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべて</option>
            <option value="owned">自社所有</option>
            <option value="leased">リース</option>
            <option value="rented">レンタル</option>
          </select>
        </div>

        {/* ステータス */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status"
            value={filters.status}
            onChange={handleStatusChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="">すべて</option>
            <option value="available">利用可能</option>
            <option value="in_use">使用中</option>
            <option value="maintenance">点検中</option>
            <option value="out_of_service">使用不可</option>
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
                onClick={() => setFilters({ ...filters, searchQuery: '' })}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.categoryId && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              カテゴリー: {uniqueCategories.find(cat =>
                categories.find(e => e.heavy_equipment_categories?.name === cat?.name)?.category_id === filters.categoryId
              )?.name}
              <button
                onClick={() => setFilters({ ...filters, categoryId: '' })}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-green-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.ownershipType && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {filters.ownershipType === 'owned' ? '自社所有' : filters.ownershipType === 'leased' ? 'リース' : 'レンタル'}
              <button
                onClick={() => setFilters({ ...filters, ownershipType: '' })}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-purple-200"
              >
                ×
              </button>
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              {filters.status === 'available' ? '利用可能' :
               filters.status === 'in_use' ? '使用中' :
               filters.status === 'maintenance' ? '点検中' : '使用不可'}
              <button
                onClick={() => setFilters({ ...filters, status: '' })}
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
