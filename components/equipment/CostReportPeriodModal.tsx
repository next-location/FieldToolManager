'use client'

import { X } from 'lucide-react'

interface CostReportPeriodModalProps {
  isOpen: boolean
  onClose: () => void
  periodStart: string
  periodEnd: string
  onPeriodStartChange: (value: string) => void
  onPeriodEndChange: (value: string) => void
  onSetPeriod: (months: number) => void
}

export default function CostReportPeriodModal({
  isOpen,
  onClose,
  periodStart,
  periodEnd,
  onPeriodStartChange,
  onPeriodEndChange,
  onSetPeriod,
}: CostReportPeriodModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-end justify-center sm:items-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-t-lg sm:rounded-lg bg-white text-left shadow-xl transition-all w-full sm:max-w-lg animate-slideUp">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">期間設定</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 p-1"
              aria-label="閉じる"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="px-4 py-6 space-y-4">
            {/* 開始日 */}
            <div>
              <label htmlFor="period-start" className="block text-sm font-medium text-gray-700 mb-1">
                開始日
              </label>
              <input
                type="date"
                id="period-start"
                value={periodStart}
                onChange={(e) => onPeriodStartChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* 終了日 */}
            <div>
              <label htmlFor="period-end" className="block text-sm font-medium text-gray-700 mb-1">
                終了日
              </label>
              <input
                type="date"
                id="period-end"
                value={periodEnd}
                onChange={(e) => onPeriodEndChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* プリセットボタン */}
            <div className="pt-2">
              <p className="text-xs font-medium text-gray-700 mb-2">クイック選択</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSetPeriod(1)}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  過去1ヶ月
                </button>
                <button
                  onClick={() => onSetPeriod(3)}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  過去3ヶ月
                </button>
                <button
                  onClick={() => onSetPeriod(6)}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  過去6ヶ月
                </button>
                <button
                  onClick={() => onSetPeriod(12)}
                  className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
                >
                  過去1年
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-4 bg-gray-50 flex justify-end space-x-3 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              onClick={handleApply}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              適用
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
