'use client'

import { X } from 'lucide-react'

interface PaymentFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  useMonthFilter: boolean
  setUseMonthFilter: (value: boolean) => void
  selectedYear: number
  setSelectedYear: (value: number) => void
  selectedMonth: number
  setSelectedMonth: (value: number) => void
  startDate: string
  setStartDate: (value: string) => void
  endDate: string
  setEndDate: (value: string) => void
  paymentTypeFilter: 'all' | 'receipt' | 'payment'
  setPaymentTypeFilter: (value: 'all' | 'receipt' | 'payment') => void
  paymentMethodFilter: string
  setPaymentMethodFilter: (value: string) => void
  yearOptions: number[]
  monthOptions: number[]
  onReset: () => void
}

export default function PaymentFiltersModal({
  isOpen,
  onClose,
  useMonthFilter,
  setUseMonthFilter,
  selectedYear,
  setSelectedYear,
  selectedMonth,
  setSelectedMonth,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  paymentTypeFilter,
  setPaymentTypeFilter,
  paymentMethodFilter,
  setPaymentMethodFilter,
  yearOptions,
  monthOptions,
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
          {/* 日付フィルター切り替え */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              日付フィルター
            </label>
            <div className="inline-flex w-full rounded-lg border border-gray-300 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setUseMonthFilter(true)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  useMonthFilter
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                }`}
              >
                月単位
              </button>
              <button
                type="button"
                onClick={() => setUseMonthFilter(false)}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  !useMonthFilter
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-white'
                }`}
              >
                期間指定
              </button>
            </div>
          </div>

          {/* 月単位フィルター */}
          {useMonthFilter ? (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {monthOptions.map(month => (
                    <option key={month} value={month}>
                      {month}月
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* 期間指定フィルター */
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了日
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* 入出金タイプフィルター（ボタン形式） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              入出金タイプ
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentTypeFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  paymentTypeFilter === 'all'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                すべて
              </button>
              <button
                type="button"
                onClick={() => setPaymentTypeFilter('receipt')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  paymentTypeFilter === 'receipt'
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                入金のみ
              </button>
              <button
                type="button"
                onClick={() => setPaymentTypeFilter('payment')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  paymentTypeFilter === 'payment'
                    ? 'bg-red-500 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                出金のみ
              </button>
            </div>
          </div>

          {/* 支払方法フィルター */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              支払方法
            </label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
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
