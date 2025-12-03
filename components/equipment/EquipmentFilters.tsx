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

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-6">
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
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>

        {/* カテゴリー */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
            カテゴリ
          </label>
          <select
            id="category"
            value={filters.categoryId}
            onChange={handleCategoryChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">すべて</option>
            {uniqueCategories.map((cat) => (
              <option key={cat?.name} value={categories.find(e => e.heavy_equipment_categories?.name === cat?.name)?.category_id}>
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
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">すべて</option>
            <option value="available">利用可能</option>
            <option value="in_use">使用中</option>
            <option value="maintenance">点検中</option>
            <option value="out_of_service">使用不可</option>
          </select>
        </div>
      </div>

      {/* リセットボタン */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleReset}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          リセット
        </button>
      </div>
    </div>
  )
}
