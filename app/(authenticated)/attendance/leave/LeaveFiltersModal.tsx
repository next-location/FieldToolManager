'use client'

import { X } from 'lucide-react'
import { LeaveFilterState } from './LeaveFilters'

interface User {
  id: string
  name: string
}

interface LeaveFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  filters: LeaveFilterState
  users: User[]
  isAdminOrManager: boolean
  onFilterChange: (key: keyof LeaveFilterState, value: string) => void
  onApply: () => void
  onReset: () => void
}

export default function LeaveFiltersModal({
  isOpen,
  onClose,
  filters,
  users,
  isAdminOrManager,
  onFilterChange,
  onApply,
  onReset,
}: LeaveFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onApply()
    onClose()
  }

  const leaveTypes = [
    { value: 'paid', label: '有給休暇' },
    { value: 'sick', label: '病気休暇' },
    { value: 'personal', label: '私用休暇' },
    { value: 'other', label: 'その他' },
  ]

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
          {/* 期間開始日 */}
          <div>
            <label
              htmlFor="modal-startDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              期間（開始）
            </label>
            <input
              type="date"
              id="modal-startDate"
              value={filters.startDate}
              onChange={(e) => onFilterChange('startDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 期間終了日 */}
          <div>
            <label
              htmlFor="modal-endDate"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              期間（終了）
            </label>
            <input
              type="date"
              id="modal-endDate"
              value={filters.endDate}
              onChange={(e) => onFilterChange('endDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 休暇種別フィルター */}
          <div>
            <label
              htmlFor="modal-leaveType"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              種別
            </label>
            <select
              id="modal-leaveType"
              value={filters.leaveType}
              onChange={(e) => onFilterChange('leaveType', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              {leaveTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
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
