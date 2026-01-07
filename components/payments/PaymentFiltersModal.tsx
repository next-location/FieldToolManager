'use client'

import { X } from 'lucide-react'

interface PaymentFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  typeFilter: 'all' | 'receipt' | 'payment'
  setTypeFilter: (value: 'all' | 'receipt' | 'payment') => void
  methodFilter: string
  setMethodFilter: (value: string) => void
  onReset: () => void
}

export default function PaymentFiltersModal({
  isOpen,
  onClose,
  typeFilter,
  setTypeFilter,
  methodFilter,
  setMethodFilter,
  onReset,
}: PaymentFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onClose()
  }

  return (
    <>
      {/* 背景オーバーレイ */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] animate-fadeIn"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-[70] animate-slideUp max-h-[80vh] flex flex-col">
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">フィルター</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* 種別 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              種別
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'all' | 'receipt' | 'payment')}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="receipt">入金</option>
              <option value="payment">支払</option>
            </select>
          </div>

          {/* 支払方法 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支払方法
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="bank_transfer">銀行振込</option>
              <option value="cash">現金</option>
              <option value="credit_card">クレジットカード</option>
              <option value="check">小切手</option>
              <option value="other">その他</option>
            </select>
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
