'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string
  invoice_date: string
  due_date: string
  total_amount: number
  paid_amount: number
  status: string
  client?: { name: string }
  project?: { project_name: string }
}

interface InvoiceListClientProps {
  invoices: Invoice[]
}

export function InvoiceListClient({ invoices }: InvoiceListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [sortField, setSortField] = useState<'invoice_date' | 'due_date' | 'total_amount'>('invoice_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // ソート処理
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // フィルタ・ソート済みデータ
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices.filter((invoice) => {
      // 検索クエリフィルタ
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        invoice.invoice_number.toLowerCase().includes(searchLower) ||
        invoice.client?.name.toLowerCase().includes(searchLower) ||
        invoice.project?.project_name?.toLowerCase().includes(searchLower)

      // ステータスフィルタ
      const matchesStatus =
        statusFilter === 'all' || invoice.status === statusFilter

      // 入金状況フィルタ
      const isPaid = invoice.paid_amount >= invoice.total_amount
      const isPartiallyPaid = invoice.paid_amount > 0 && !isPaid
      const isUnpaid = invoice.paid_amount === 0

      const matchesPayment =
        paymentFilter === 'all' ||
        (paymentFilter === 'paid' && isPaid) ||
        (paymentFilter === 'partial' && isPartiallyPaid) ||
        (paymentFilter === 'unpaid' && isUnpaid)

      return matchesSearch && matchesStatus && matchesPayment
    })

    // ソート
    filtered.sort((a, b) => {
      let aValue: number | string = 0
      let bValue: number | string = 0

      if (sortField === 'invoice_date') {
        aValue = new Date(a.invoice_date).getTime()
        bValue = new Date(b.invoice_date).getTime()
      } else if (sortField === 'due_date') {
        aValue = new Date(a.due_date).getTime()
        bValue = new Date(b.due_date).getTime()
      } else if (sortField === 'total_amount') {
        aValue = a.total_amount
        bValue = b.total_amount
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [invoices, searchQuery, statusFilter, paymentFilter, sortField, sortOrder])

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  return (
    <>
      {/* 検索・フィルタエリア */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="請求番号・取引先・工事名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全て</option>
              <option value="draft">下書き</option>
              <option value="approved">承認済</option>
              <option value="sent">送付済</option>
              <option value="paid">入金済</option>
            </select>
          </div>

          {/* 入金状況 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              入金状況
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全て</option>
              <option value="paid">入金済</option>
              <option value="partial">一部入金</option>
              <option value="unpaid">未入金</option>
            </select>
          </div>
        </div>
      </div>

      {/* 件数表示 */}
      <div className="mb-4">
        <div className="text-sm text-gray-700">
          全 {invoices.length} 件中 {filteredAndSortedInvoices.length} 件を表示
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  請求番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工事名
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('invoice_date')}
                >
                  請求日 <SortIcon field="invoice_date" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('due_date')}
                >
                  支払期日 <SortIcon field="due_date" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('total_amount')}
                >
                  金額（税込） <SortIcon field="total_amount" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  入金状況
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedInvoices.map((invoice) => {
                const isPaid = invoice.paid_amount >= invoice.total_amount
                const isPartiallyPaid = invoice.paid_amount > 0 && !isPaid
                const isOverdue = !isPaid && new Date(invoice.due_date) < new Date()

                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.client?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.project?.project_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
                        {isOverdue && !isPaid && (
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            期限超過
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      ¥{invoice.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {isPaid ? (
                        <span className="text-green-600 font-medium">入金済</span>
                      ) : isPartiallyPaid ? (
                        <span className="text-yellow-600 font-medium">
                          一部入金 ¥{invoice.paid_amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-500">未入金</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                        invoice.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : invoice.status === 'approved'
                          ? 'bg-blue-100 text-blue-800'
                          : invoice.status === 'sent'
                          ? 'bg-purple-100 text-purple-800'
                          : invoice.status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : isOverdue
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {invoice.status === 'draft' ? '下書き'
                          : invoice.status === 'approved' ? '承認済'
                          : invoice.status === 'sent' ? '送付済'
                          : invoice.status === 'paid' ? '入金済'
                          : isOverdue ? '期限超過'
                          : invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        詳細
                      </Link>
                      {invoice.status === 'draft' && (
                        <Link
                          href={`/invoices/${invoice.id}/edit`}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          編集
                        </Link>
                      )}
                      <a
                        href={`/api/invoices/${invoice.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-900 mr-3"
                      >
                        PDF
                      </a>
                      {!isPaid && (
                        <Link
                          href={`/payments/new?invoice_id=${invoice.id}`}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          入金登録
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {filteredAndSortedInvoices.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
                ? '検索条件に一致する請求書がありません'
                : '請求書データがありません'}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
