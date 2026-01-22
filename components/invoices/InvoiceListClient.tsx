'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toHiragana, toKatakana } from '@/lib/utils/japanese'
import { SlidersHorizontal, Search } from 'lucide-react'
import InvoiceFiltersModal from './InvoiceFiltersModal'

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
  created_by_user?: { name: string }
  approved_by_user?: { name: string }
  manager_approved_at?: string
}

interface InvoiceListClientProps {
  invoices: Invoice[]
  userRole: string
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

export function InvoiceListClient({ invoices, userRole }: InvoiceListClientProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [staffFilter, setStaffFilter] = useState('all')
  const [sortField, setSortField] = useState<'invoice_date' | 'due_date' | 'total_amount'>('invoice_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)

  // スタッフリストを取得（マネージャー・管理者のみ）
  const staffList = useMemo(() => {
    if (!isManagerOrAdmin) return []
    const uniqueStaff = new Set<string>()
    invoices.forEach((invoice) => {
      if (invoice.created_by_user?.name) {
        uniqueStaff.add(invoice.created_by_user.name)
      }
    })
    return Array.from(uniqueStaff).sort()
  }, [invoices, isManagerOrAdmin])

  const handleDelete = async (invoiceId: string, invoiceNumber: string) => {
    if (!confirm(`請求書「${invoiceNumber}」を削除してもよろしいですか？`)) {
      return
    }

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/delete`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '削除に失敗しました')
      }

      alert('請求書を削除しました')
      router.refresh()
    } catch (error: any) {
      alert(error.message || '削除に失敗しました')
    }
  }

  // フィルタ・ソート済みデータ
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = invoices.filter((invoice) => {
      // 検索クエリフィルタ（ひらがな・カタカナ対応）
      const matchesSearch =
        !searchQuery ||
        invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (invoice.client?.name && matchesKanaSearch(invoice.client.name, searchQuery)) ||
        (invoice.project?.project_name && matchesKanaSearch(invoice.project.project_name, searchQuery))

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

      // スタッフフィルタ（マネージャー・管理者のみ）
      const matchesStaff =
        !isManagerOrAdmin ||
        staffFilter === 'all' ||
        invoice.created_by_user?.name === staffFilter

      return matchesSearch && matchesStatus && matchesPayment && matchesStaff
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
  }, [invoices, searchQuery, statusFilter, paymentFilter, staffFilter, sortField, sortOrder, isManagerOrAdmin])

  // ページネーション
  const totalPages = Math.ceil(filteredAndSortedInvoices.length / itemsPerPage)
  const paginatedInvoices = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedInvoices.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedInvoices, currentPage, itemsPerPage])

  // フィルター変更時にページをリセット
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter, paymentFilter, staffFilter, sortField, sortOrder])

  const getStatusColor = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'paid') return 'bg-red-100 text-red-800'
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-orange-100 text-orange-800'
      case 'approved': return 'bg-blue-100 text-blue-800'
      case 'sent': return 'bg-purple-100 text-purple-800'
      case 'paid': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string, isOverdue: boolean) => {
    if (isOverdue && status !== 'paid') return '期限超過'
    switch (status) {
      case 'draft': return '下書き'
      case 'submitted': return '提出済み'
      case 'approved': return '承認済み'
      case 'sent': return '送付済み'
      case 'paid': return '入金済み'
      default: return status
    }
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || paymentFilter !== 'all' || (isManagerOrAdmin && staffFilter !== 'all')

  const filterCount = (statusFilter !== 'all' ? 1 : 0) + (paymentFilter !== 'all' ? 1 : 0) + (staffFilter !== 'all' ? 1 : 0)

  const handleReset = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setPaymentFilter('all')
    setStaffFilter('all')
  }

  return (
    <>
      {/* モバイル: 検索+フィルターボタン */}
      <div className="sm:hidden mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="請求番号・取引先・工事名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="relative px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 flex items-center gap-2"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PC: 検索・フィルタエリア */}
      <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
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

        <div className={`grid grid-cols-1 ${isManagerOrAdmin ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-4`}>
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="請求番号・取引先・工事名で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              <option value="draft">下書き</option>
              <option value="submitted">提出済み</option>
              <option value="approved">承認済</option>
              <option value="sent">送付済</option>
              <option value="paid">入金済</option>
            </select>
          </div>

          {/* 入金状況 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              入金状況
            </label>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              <option value="paid">入金済</option>
              <option value="partial">一部入金</option>
              <option value="unpaid">未入金</option>
            </select>
          </div>

          {/* スタッフフィルタ（マネージャー・管理者のみ） */}
          {isManagerOrAdmin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作成スタッフ
              </label>
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">すべて</option>
                {staffList.map((staff) => (
                  <option key={staff} value={staff}>
                    {staff}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 件数表示とソート */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          全 {invoices.length} 件中 {filteredAndSortedInvoices.length} 件を表示（{currentPage}/{totalPages} ページ）
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-600">並び替え:</label>
          <select
            value={`${sortField}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortField, 'asc' | 'desc']
              setSortField(field)
              setSortOrder(order)
            }}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="invoice_date-desc">請求日（新しい順）</option>
            <option value="invoice_date-asc">請求日（古い順）</option>
            <option value="due_date-desc">支払期日（新しい順）</option>
            <option value="due_date-asc">支払期日（古い順）</option>
            <option value="total_amount-desc">金額（高い順）</option>
            <option value="total_amount-asc">金額（安い順）</option>
          </select>
        </div>
      </div>

      {/* カード表示 */}
      <div className="space-y-4">
        {paginatedInvoices.map((invoice) => {
          const isPaid = invoice.paid_amount >= invoice.total_amount
          const isPartiallyPaid = invoice.paid_amount > 0 && !isPaid
          const isOverdue = !isPaid && new Date(invoice.due_date) < new Date()
          const statusColors = getStatusColor(invoice.status, isOverdue)
          const statusText = getStatusText(invoice.status, isOverdue)

          return (
            <div key={invoice.id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
              {/* クリック可能なカード本体 */}
              <div
                className="px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors relative"
                onClick={() => router.push(`/invoices/${invoice.id}`)}
              >
                {/* ステータスと請求番号（左上） */}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${statusColors}`}>
                    {statusText}
                  </span>
                  <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{invoice.invoice_number}</span>
                </div>

                {/* 請求日・支払期日（右上・横並び） */}
                <div className="absolute top-2 right-2 flex items-center gap-4 text-xs text-gray-500">
                  <div className="whitespace-nowrap">
                    請求日: {new Date(invoice.invoice_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  <div className="whitespace-nowrap">
                    支払期日: {new Date(invoice.due_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    {isOverdue && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                        期限超過
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-6">
                  {/* 左側：取引先名・工事名（横並び） */}
                  <div className="flex-1 min-w-0 flex items-center gap-8">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">取引先</div>
                      <div className="font-bold text-gray-900 truncate">
                        {invoice.client?.name || '-'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">工事名</div>
                      <div className="text-sm text-gray-900 truncate">
                        {invoice.project?.project_name || '-'}
                      </div>
                    </div>
                  </div>

                  {/* 中央：作成者・承認者（縦並び） */}
                  <div className="mx-8">
                    {isManagerOrAdmin && invoice.created_by_user && (
                      <div className="mb-1">
                        <span className="text-xs text-gray-500">作成者: </span>
                        <span className="text-xs text-gray-900">
                          {invoice.created_by_user.name}
                        </span>
                      </div>
                    )}
                    {invoice.manager_approved_at && invoice.approved_by_user && (
                      <div>
                        <span className="text-xs text-gray-500">承認者: </span>
                        <span className="text-xs text-gray-900">
                          {invoice.approved_by_user.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 右側：金額 */}
                  <div className="text-right ml-8">
                    <div className="text-xs text-gray-500 mb-0.5">金額（税込）</div>
                    <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                      ¥{Math.floor(invoice.total_amount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* ボタンエリア（カード外・右寄せ） */}
              <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-end gap-2">
                {invoice.status === 'draft' && (
                  <Link
                    href={`/invoices/${invoice.id}/edit`}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-md hover:bg-blue-700 transition-colors"
                  >
                    編集
                  </Link>
                )}
                {/* PDF出力: 承認済み以降、かつ送付済み以降はマネージャー・管理者のみ */}
                {invoice.status !== 'draft' && invoice.status !== 'submitted' &&
                 (invoice.status === 'approved' || isManagerOrAdmin) && (
                  <a
                    href={`/api/invoices/${invoice.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white text-sm font-bold rounded-md hover:bg-green-700 transition-colors"
                  >
                    PDF出力
                  </a>
                )}
                {/* 削除ボタン: 下書きのみ */}
                {invoice.status === 'draft' && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(invoice.id, invoice.invoice_number)
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-md hover:bg-red-700 transition-colors"
                  >
                    削除
                  </button>
                )}
                {!isPaid && invoice.status === 'sent' && isManagerOrAdmin && (
                  <Link
                    href={`/payments/new?invoice_id=${invoice.id}`}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 transition-colors"
                  >
                    入金登録
                  </Link>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {filteredAndSortedInvoices.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          {searchQuery || statusFilter !== 'all' || paymentFilter !== 'all'
            ? '検索条件に一致する請求書がありません'
            : '請求書データがありません'}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* フィルターモーダル */}
      <InvoiceFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        paymentFilter={paymentFilter}
        setPaymentFilter={setPaymentFilter}
        staffFilter={staffFilter}
        setStaffFilter={setStaffFilter}
        staffList={staffList}
        isManagerOrAdmin={isManagerOrAdmin}
        onReset={handleReset}
      />
    </>
  )
}