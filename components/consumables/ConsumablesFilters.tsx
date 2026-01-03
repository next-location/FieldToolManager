'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import ConsumablesFiltersModal from './ConsumablesFiltersModal'

interface FilterState {
  searchQuery: string
  stockStatus: string
}

interface ConsumablesFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export default function ConsumablesFilters({ onFilterChange }: ConsumablesFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [stockStatus, setStockStatus] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    onFilterChange({
      searchQuery: value,
      stockStatus,
    })
  }

  const handleStockStatusChange = (value: string) => {
    setStockStatus(value)
    onFilterChange({
      searchQuery,
      stockStatus: value,
    })
  }

  const handleReset = () => {
    setSearchQuery('')
    setStockStatus('')
    onFilterChange({
      searchQuery: '',
      stockStatus: '',
    })
  }

  const hasActiveFilters = searchQuery || stockStatus

  // フィルター数をカウント（検索ワード以外）
  const filterCount = stockStatus ? 1 : 0

  const handleApply = () => {
    onFilterChange({ searchQuery, stockStatus })
  }

  return (
    <>
      {/* モバイル表示: 検索ボックスとフィルターボタンを1行に */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="消耗品名で検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="relative p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
            aria-label="フィルター"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PC表示: 従来通りのフィルター */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 検索 */}
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              消耗品名
            </label>
            <input
              type="text"
              id="search"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="消耗品名、型番で検索..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* 在庫状況 */}
          <div>
            <label htmlFor="stockStatus" className="block text-sm font-medium text-gray-700 mb-1">
              在庫状況
            </label>
            <select
              id="stockStatus"
              value={stockStatus}
              onChange={(e) => handleStockStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">すべて</option>
              <option value="in_stock">在庫あり</option>
              <option value="low_stock">在庫不足</option>
            </select>
          </div>
        </div>
      </div>

      {/* モバイル用フィルターモーダル */}
      <ConsumablesFiltersModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        stockStatus={stockStatus}
        onStockStatusChange={handleStockStatusChange}
        onApply={handleApply}
        onReset={handleReset}
      />
    </>
  )
}
