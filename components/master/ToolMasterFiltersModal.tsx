'use client'

import { X } from 'lucide-react'

interface Category {
  id: string
  name: string
}

interface ToolMasterFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  searchQuery: string
  selectedCategory: string
  categories: Category[]
  onSearchChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onReset: () => void
}

export default function ToolMasterFiltersModal({
  isOpen,
  onClose,
  searchQuery,
  selectedCategory,
  categories,
  onSearchChange,
  onCategoryChange,
  onReset,
}: ToolMasterFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onClose()
  }

  const handleReset = () => {
    onReset()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 animate-fadeIn"
        onClick={onClose}
      />

      {/* モーダルコンテンツ */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl animate-slideUp">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">絞り込み</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* フィルター内容 */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* カテゴリー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリー
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            クリア
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            適用
          </button>
        </div>
      </div>
    </div>
  )
}
