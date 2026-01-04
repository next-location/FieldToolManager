'use client'

import { X } from 'lucide-react'

interface FilterState {
  searchQuery: string
  categoryId: string
  ownershipType: string
  status: string
}

interface Category {
  name: string
  icon: string
}

interface EquipmentFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: FilterState
  categories: Category[]
  onFilterChange: (key: keyof FilterState, value: string) => void
  onApply: () => void
  onReset: () => void
}

export default function EquipmentFiltersModal({
  isOpen,
  onClose,
  filters,
  categories,
  onFilterChange,
  onApply,
  onReset,
}: EquipmentFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onApply()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-50 max-h-[80vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4">
          {/* カテゴリーフィルター */}
          <div>
            <label
              htmlFor="modal-category"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              カテゴリー
            </label>
            <select
              id="modal-category"
              value={filters.categoryId}
              onChange={(e) => onFilterChange('categoryId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              {categories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* 所有形態フィルター */}
          <div>
            <label
              htmlFor="modal-ownership"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              所有形態
            </label>
            <select
              id="modal-ownership"
              value={filters.ownershipType}
              onChange={(e) => onFilterChange('ownershipType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="owned">自社所有</option>
              <option value="leased">リース</option>
              <option value="rented">レンタル</option>
            </select>
          </div>

          {/* ステータスフィルター */}
          <div>
            <label
              htmlFor="modal-status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ステータス
            </label>
            <select
              id="modal-status"
              value={filters.status}
              onChange={(e) => onFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="available">利用可能</option>
              <option value="in_use">使用中</option>
              <option value="maintenance">点検中</option>
              <option value="out_of_service">使用不可</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
