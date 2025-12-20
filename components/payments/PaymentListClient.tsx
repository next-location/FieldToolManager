'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { toHiragana, toKatakana } from '@/lib/utils/japanese'

interface Payment {
  id: string
  payment_date: string
  payment_type: 'receipt' | 'payment'
  amount: number
  payment_method: string
  reference_number?: string
  notes?: string
  invoice?: {
    invoice_number: string
    client?: { name: string }
  }
  purchase_order?: {
    order_number: string
    supplier?: { name: string }
  }
}

interface PaymentListClientProps {
  payments: Payment[]
}

// ひらがな・カタカナ変換関数
function normalizeKana(text: string): string {
  // 全角・半角を正規化し、ひらがなとカタカナ両方のパターンを生成
  const normalized = text.normalize('NFKC')
  const hiragana = toHiragana(normalized)
  const katakana = toKatakana(normalized)
  return `${normalized}|${hiragana}|${katakana}`
}

function matchesKanaSearch(text: string, searchQuery: string): boolean {
  if (!text || !searchQuery) return false

  const normalizedText = normalizeKana(text.toLowerCase())
  const normalizedQuery = normalizeKana(searchQuery.toLowerCase())

  // いずれかのパターンでマッチするか確認
  const queryPatterns = normalizedQuery.split('|')
  const textPatterns = normalizedText.split('|')

  return queryPatterns.some(qp =>
    textPatterns.some(tp => tp.includes(qp))
  )
}

export function PaymentListClient({ payments }: PaymentListClientProps) {
  const currentDate = new Date()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<'all' | 'receipt' | 'payment'>('all')
  const [useMonthFilter, setUseMonthFilter] = useState(true)

  // 年の選択肢を生成（過去5年から来年まで）
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentDate.getFullYear() - 5 + i)

  // 月の選択肢
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1)

  // フィルタリングされたデータ
  const filteredPayments = useMemo(() => {
    let filtered = [...payments]

    // キーワード検索（取引先名・請求書番号）
    if (searchQuery) {
      filtered = filtered.filter(payment => {
        const clientName = payment.payment_type === 'receipt'
          ? payment.invoice?.client?.name
          : payment.purchase_order?.supplier?.name

        const invoiceNumber = payment.payment_type === 'receipt'
          ? payment.invoice?.invoice_number
          : payment.purchase_order?.order_number

        // 取引先名で検索（ひらがな・カタカナ対応）
        const nameMatch = clientName && matchesKanaSearch(clientName, searchQuery)

        // 請求書番号で検索
        const numberMatch = invoiceNumber && invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())

        return nameMatch || numberMatch
      })
    }

    // 日付フィルター
    if (useMonthFilter) {
      // 月単位フィルター
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.payment_date)
        return paymentDate.getFullYear() === selectedYear &&
               paymentDate.getMonth() + 1 === selectedMonth
      })
    } else if (startDate || endDate) {
      // 期間フィルター
      filtered = filtered.filter(payment => {
        const paymentDate = new Date(payment.payment_date)
        const start = startDate ? new Date(startDate) : new Date('1900-01-01')
        const end = endDate ? new Date(endDate) : new Date('2100-12-31')
        return paymentDate >= start && paymentDate <= end
      })
    }

    // 入出金タイプフィルター
    if (paymentTypeFilter !== 'all') {
      filtered = filtered.filter(payment => payment.payment_type === paymentTypeFilter)
    }

    // 日付順でソート（新しい順 - 降順）
    filtered.sort((a, b) => {
      const dateA = new Date(a.payment_date).getTime()
      const dateB = new Date(b.payment_date).getTime()
      return dateB - dateA
    })

    return filtered
  }, [payments, searchQuery, selectedYear, selectedMonth, startDate, endDate, paymentTypeFilter, useMonthFilter])

  // 集計
  const totals = useMemo(() => {
    const receipts = filteredPayments
      .filter(p => p.payment_type === 'receipt')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    const payments = filteredPayments
      .filter(p => p.payment_type === 'payment')
      .reduce((sum, p) => sum + Number(p.amount), 0)

    return {
      receipts,
      payments,
      balance: receipts - payments
    }
  }, [filteredPayments])

  const hasActiveFilters = searchQuery || paymentTypeFilter !== 'all' || !useMonthFilter || startDate || endDate

  const handleReset = () => {
    setSearchQuery('')
    setPaymentTypeFilter('all')
    setUseMonthFilter(true)
    setStartDate('')
    setEndDate('')
    setSelectedYear(currentDate.getFullYear())
    setSelectedMonth(currentDate.getMonth() + 1)
  }

  return (
    <>
      {/* フィルターエリア */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          )}
        </div>

        {/* キーワード検索 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            キーワード検索
          </label>
          <input
            type="text"
            placeholder="取引先名・請求書番号で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 日付フィルター */}
        <div className="flex items-start gap-4">
          {/* 日付フィルター切り替え（スタイリッシュなトグルボタン） */}
          <div className="flex-shrink-0">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              日付フィルター
            </label>
            <div className="inline-flex rounded-lg border border-gray-300 bg-gray-50 p-0.5 h-[42px]">
              <button
                type="button"
                onClick={() => setUseMonthFilter(true)}
                className={`px-4 rounded-md text-sm font-medium transition-all flex items-center ${
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
                className={`px-4 rounded-md text-sm font-medium transition-all flex items-center ${
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
            <div className="flex gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  年
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {yearOptions.map(year => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  月
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <div className="flex gap-4 flex-1">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  開始日
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  終了日
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

      </div>
    </div>

      {/* 入出金タイプフィルター（白背景で囲む） */}
      <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setPaymentTypeFilter('all')}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
              paymentTypeFilter === 'all'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            全て
          </button>
          <button
            type="button"
            onClick={() => setPaymentTypeFilter('receipt')}
            className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
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
            className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
              paymentTypeFilter === 'payment'
                ? 'bg-red-500 text-white shadow-md'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            出金のみ
          </button>
        </div>
      </div>

      {/* データテーブル */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            入出金一覧
            {useMonthFilter && ` (${selectedYear}年${selectedMonth}月)`}
            {!useMonthFilter && (startDate || endDate) &&
              ` (${startDate || '開始日未指定'} 〜 ${endDate || '終了日未指定'})`}
          </h2>
          <div className="text-sm text-gray-500">
            {filteredPayments.length}件表示
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  日付
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  種別
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  関連帳票
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  支払方法
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  金額
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayments.map((payment) => {
                const isReceipt = payment.payment_type === 'receipt'
                const clientName = isReceipt
                  ? payment.invoice?.client?.name
                  : payment.purchase_order?.supplier?.name

                return (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                        isReceipt
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {isReceipt ? '入金' : '出金'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {clientName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {isReceipt && payment.invoice
                        ? `請求書: ${payment.invoice.invoice_number}`
                        : !isReceipt && payment.purchase_order
                        ? `発注書: ${payment.purchase_order.order_number}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.payment_method === 'bank_transfer' ? '銀行振込'
                        : payment.payment_method === 'cash' ? '現金'
                        : payment.payment_method === 'check' ? '小切手'
                        : payment.payment_method === 'credit_card' ? 'クレジットカード'
                        : 'その他'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <span className={isReceipt ? 'text-green-600' : 'text-red-600'}>
                        {isReceipt ? '+' : '-'}¥{payment.amount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/payments/${payment.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        詳細
                      </Link>
                      {isReceipt && (
                        <a
                          href={`/api/payments/${payment.id}/receipt`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-900"
                        >
                          領収書
                        </a>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              条件に一致する入出金データがありません
            </div>
          )}
        </div>

        {/* 集計 */}
        {filteredPayments.length > 0 && (
          <div className="px-6 py-4 border-t bg-gray-50">
            <div className="flex justify-end space-x-6 text-sm">
              <div>
                <span className="text-gray-500">入金合計:</span>
                <span className="ml-2 font-semibold text-green-600">
                  ¥{totals.receipts.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">出金合計:</span>
                <span className="ml-2 font-semibold text-red-600">
                  ¥{totals.payments.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500">収支:</span>
                <span className={`ml-2 font-semibold ${
                  totals.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ¥{totals.balance.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}