'use client'

import { X } from 'lucide-react'

interface MaintenanceFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  selectedType: string
  sortBy: 'date' | 'cost'
  onTypeChange: (value: string) => void
  onSortChange: (value: 'date' | 'cost') => void
  onReset: () => void
}

export default function MaintenanceFiltersModal({
  isOpen,
  onClose,
  selectedType,
  sortBy,
  onTypeChange,
  onSortChange,
  onReset,
}: MaintenanceFiltersModalProps) {
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
          {/* 点検タイプ */}
          <div>
            <label
              htmlFor="modal-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              点検タイプ
            </label>
            <select
              id="modal-type"
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="vehicle_inspection">車検</option>
              <option value="insurance_renewal">保険更新</option>
              <option value="repair">修理</option>
              <option value="other">その他</option>
            </select>
          </div>

          {/* 並び順 */}
          <div>
            <label
              htmlFor="modal-sort"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              並び順
            </label>
            <select
              id="modal-sort"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as 'date' | 'cost')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="date">実施日順</option>
              <option value="cost">費用順</option>
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
