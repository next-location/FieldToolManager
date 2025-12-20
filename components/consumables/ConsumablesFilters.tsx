'use client'

import { useState } from 'react'

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
  )
}
