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

  return (
    <div className="bg-white p-4 rounded-lg shadow mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 検索 */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            検索
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="消耗品名、型番で検索..."
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="block w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">すべて</option>
            <option value="in_stock">在庫あり</option>
            <option value="low_stock">在庫不足</option>
          </select>
        </div>

        {/* リセットボタン */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleReset}
            className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            リセット
          </button>
        </div>
      </div>
    </div>
  )
}
