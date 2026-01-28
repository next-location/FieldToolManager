'use client'

import { X } from 'lucide-react'

interface CostAnalyticsFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  periodMonths: number
  filterType: 'all' | 'tool' | 'consumable'
  sortBy: 'cost' | 'efficiency' | 'category'
  onPeriodChange: (value: number) => void
  onFilterTypeChange: (value: 'all' | 'tool' | 'consumable') => void
  onSortByChange: (value: 'cost' | 'efficiency' | 'category') => void
}

export default function CostAnalyticsFiltersModal({
  isOpen,
  onClose,
  periodMonths,
  filterType,
  sortBy,
  onPeriodChange,
  onFilterTypeChange,
  onSortByChange,
}: CostAnalyticsFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
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
          <h2 className="text-lg font-semibold text-gray-900">絞り込み</h2>
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
          {/* 分析期間 */}
          <div>
            <label
              htmlFor="modal-period"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              分析期間
            </label>
            <select
              id="modal-period"
              value={periodMonths}
              onChange={(e) => onPeriodChange(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={3}>過去3ヶ月</option>
              <option value={6}>過去6ヶ月</option>
              <option value={12}>過去1年</option>
              <option value={24}>過去2年</option>
            </select>
          </div>

          {/* 種別 */}
          <div>
            <label
              htmlFor="modal-filterType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              種別
            </label>
            <select
              id="modal-filterType"
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="tool">道具のみ</option>
              <option value="consumable">消耗品のみ</option>
            </select>
          </div>

          {/* ソート */}
          <div>
            <label
              htmlFor="modal-sortBy"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ソート
            </label>
            <select
              id="modal-sortBy"
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="cost">コストが高い順</option>
              <option value="efficiency">効率スコアが高い順</option>
              <option value="category">カテゴリ順</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
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
