'use client'

import { X } from 'lucide-react'

interface UsageAnalyticsFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  periodMonths: number
  statusFilter: 'all' | 'active' | 'inactive' | 'rarely_used'
  sortBy: 'usage' | 'score'
  onPeriodChange: (value: number) => void
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive' | 'rarely_used') => void
  onSortByChange: (value: 'usage' | 'score') => void
}

export default function UsageAnalyticsFiltersModal({
  isOpen,
  onClose,
  periodMonths,
  statusFilter,
  sortBy,
  onPeriodChange,
  onStatusFilterChange,
  onSortByChange,
}: UsageAnalyticsFiltersModalProps) {
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
              <option value={1}>過去1ヶ月</option>
              <option value={3}>過去3ヶ月</option>
              <option value={6}>過去6ヶ月</option>
              <option value={12}>過去1年</option>
            </select>
          </div>

          {/* ステータス */}
          <div>
            <label
              htmlFor="modal-statusFilter"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              ステータス
            </label>
            <select
              id="modal-statusFilter"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="active">活発</option>
              <option value="inactive">非活発</option>
              <option value="rarely_used">ほとんど未使用</option>
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
              <option value="score">利用率スコアが高い順</option>
              <option value="usage">使用回数が多い順</option>
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
