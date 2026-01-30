'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@heroicons/react/24/outline'
import { SlidersHorizontal, Search } from 'lucide-react'
import { DeletePurchaseOrderButton } from '@/components/purchase-orders/DeletePurchaseOrderButton'
import { SendSupplierOrderButton } from './SendSupplierOrderButton'
import { MarkReceivedButton } from './MarkReceivedButton'
import { MarkPaidButton } from './MarkPaidButton'
import PurchaseOrderPageFAB from '@/components/purchase-orders/PurchaseOrderPageFAB'
import PurchaseOrderFiltersModal from '@/components/purchase-orders/PurchaseOrderFiltersModal'

interface PurchaseOrder {
  id: string
  order_number: string
  order_date: string
  delivery_date: string | null
  total_amount: number
  status: string
  approved_at: string | null
  approved_by_user?: { name: string }
  client?: { name: string }
  project?: { project_name: string }
  created_by_user?: { id: string; name: string }
}

interface Staff {
  id: string
  name: string
}

interface PurchaseOrderListClientProps {
  suppliers: { id: string; name: string; client_code: string }[]
  projects: { id: string; project_name: string }[]
  currentUserRole: string
  staffList: Staff[]
}

export function PurchaseOrderListView({
  suppliers,
  projects,
  currentUserRole,
  staffList,
}: PurchaseOrderListClientProps) {
  const router = useRouter()
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('')
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const isManagerOrAdmin = ['manager', 'admin'].includes(currentUserRole)

  // API呼び出し関数
  const fetchOrders = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        search: searchQuery,
        sort_field: 'order_date',
        sort_order: 'desc',
      })

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      if (creatorFilter) {
        params.set('creator_id', creatorFilter)
      }

      const response = await fetch(`/api/purchase-orders?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch purchase orders')
      }

      const result = await response.json()
      setOrders(result.data || [])
      setTotalCount(result.count || 0)
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error)
      alert('発注書の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初回読み込み + ページ・フィルター変更時
  useEffect(() => {
    fetchOrders()
  }, [currentPage, searchQuery, statusFilter, creatorFilter])

  // フィルター変更時は1ページ目に戻す
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchQuery, statusFilter, creatorFilter])

  // ドロップダウンの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.creator-dropdown-container')) {
        setShowCreatorDropdown(false)
      }
    }

    if (showCreatorDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showCreatorDropdown])

  // 作成者の絞り込み
  const filteredStaffList = useMemo(() => {
    if (!creatorSearchQuery) return staffList

    const query = creatorSearchQuery.toLowerCase()
    return staffList.filter((staff) => {
      return staff.name.toLowerCase().includes(query)
    })
  }, [staffList, creatorSearchQuery])

  // ページネーション
  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: '下書き', className: 'bg-gray-200 text-gray-800' },
      submitted: { label: '承認申請中', className: 'bg-orange-500 text-white' },
      approved: { label: '承認済み', className: 'bg-indigo-500 text-white' },
      rejected: { label: '差戻し', className: 'bg-red-500 text-white' },
      ordered: { label: '発注済み', className: 'bg-blue-500 text-white' },
      received: { label: '納品済み', className: 'bg-green-500 text-white' },
      paid: { label: '支払済み', className: 'bg-indigo-500 text-white' },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft

    return (
      <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded ${config.className}`}>
        {config.label}
      </span>
    )
  }

  const filterCount = (statusFilter !== 'all' ? 1 : 0) + (creatorFilter ? 1 : 0)

  const handleReset = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setCreatorFilter('')
    setCreatorSearchQuery('')
  }

  // ローディング表示
  if (isLoading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    )
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg sm:text-2xl font-bold text-gray-900">発注書一覧</h1>
        <Link
          href="/purchase-orders/new"
          className="hidden sm:inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          新規作成
        </Link>
      </div>

      {/* モバイル: 検索+フィルターボタン */}
      <div className="sm:hidden mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="発注番号・取引先・工事名で検索"
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
          {(searchQuery || statusFilter !== 'all' || creatorFilter) && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          )}
        </div>

        <div className={`grid grid-cols-1 ${isManagerOrAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="発注番号・取引先・工事名で検索"
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
              <option value="submitted">承認申請中</option>
              <option value="approved">承認済み</option>
              <option value="rejected">差戻し</option>
              <option value="ordered">発注済み</option>
              <option value="received">納品済み</option>
              <option value="paid">支払済み</option>
            </select>
          </div>

          {/* 作成者フィルタ（マネージャー・管理者のみ） */}
          {isManagerOrAdmin && (
            <div className="relative creator-dropdown-container">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                作成者
              </label>
              <input
                type="text"
                placeholder="スタッフ名で検索"
                value={creatorSearchQuery}
                onChange={(e) => setCreatorSearchQuery(e.target.value)}
                onFocus={() => setShowCreatorDropdown(true)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
              />

              {/* ドロップダウンリスト */}
              {showCreatorDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {/* 全て表示オプション */}
                  <button
                    type="button"
                    onClick={() => {
                      setCreatorFilter('')
                      setCreatorSearchQuery('')
                      setShowCreatorDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                      !creatorFilter ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                    }`}
                  >
                    全て表示
                  </button>

                  {/* スタッフリスト */}
                  {filteredStaffList.length > 0 ? (
                    filteredStaffList.map((staff) => (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => {
                          setCreatorFilter(staff.id)
                          setCreatorSearchQuery(staff.name)
                          setShowCreatorDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-100 ${
                          creatorFilter === staff.id ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                        }`}
                      >
                        {staff.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500">該当するスタッフがいません</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 件数表示 */}
      <div className="mb-4 text-sm text-gray-700">
        全 {totalCount} 件中 {orders.length} 件を表示（{currentPage}/{totalPages} ページ）
      </div>

      {/* カード一覧 */}
      <div className="space-y-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
            {/* クリック可能なカード本体 */}
            <div
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => router.push(`/purchase-orders/${order.id}`)}
            >
              {/* スマホ表示 */}
              <div className="sm:hidden p-4 space-y-3">
                {/* 発注番号とステータス */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-700">{order.order_number}</span>
                  {getStatusBadge(order.status)}
                </div>

                {/* 仕入先 */}
                <div>
                  <div className="text-xs text-gray-500">仕入先</div>
                  <div className="font-semibold text-gray-900">{order.client?.name || '-'}</div>
                </div>

                {/* 工事名 */}
                <div>
                  <div className="text-xs text-gray-500">工事名</div>
                  <div className="text-sm text-gray-900">{order.project?.project_name || '-'}</div>
                </div>

                {/* 日付情報 */}
                <div className="flex gap-4 text-xs text-gray-600">
                  <div>
                    <span className="text-gray-500">発注日: </span>
                    {new Date(order.order_date).toLocaleDateString('ja-JP')}
                  </div>
                  {order.delivery_date && (
                    <div>
                      <span className="text-gray-500">納期: </span>
                      {new Date(order.delivery_date).toLocaleDateString('ja-JP')}
                    </div>
                  )}
                </div>

                {/* 作成者・承認者 */}
                {(isManagerOrAdmin && order.created_by_user) || order.approved_at ? (
                  <div className="text-xs space-y-1">
                    {isManagerOrAdmin && order.created_by_user && (
                      <div>
                        <span className="text-gray-500">作成者: </span>
                        <span className="font-semibold text-gray-900">{order.created_by_user.name}</span>
                      </div>
                    )}
                    {order.approved_at && (
                      <div>
                        <span className="text-gray-500">承認者: </span>
                        <span className="font-semibold text-gray-900">{order.approved_by_user?.name}</span>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* 金額 */}
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500 mb-1">金額（税込）</div>
                  <div className="text-xl font-bold text-gray-900">
                    ¥{Math.floor(order.total_amount).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* PC表示 */}
              <div className="hidden sm:block px-6 py-5 relative">
                {/* ステータスと発注番号（左上） */}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  {getStatusBadge(order.status)}
                  <span className="text-xs font-bold text-gray-700 whitespace-nowrap">{order.order_number}</span>
                </div>

                {/* 発注日・納期（右上・横並び） */}
                <div className="absolute top-2 right-2 flex items-center gap-4 text-xs text-gray-500">
                  <div className="whitespace-nowrap">
                    発注日: {new Date(order.order_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                  {order.delivery_date && (
                    <div className="whitespace-nowrap">
                      納期: {new Date(order.delivery_date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-6">
                  {/* 左側：仕入先・工事名（横並び） */}
                  <div className="flex-1 min-w-0 flex items-center gap-8">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">仕入先</div>
                      <div className="font-bold text-gray-900 truncate">
                        {order.client?.name || '-'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-gray-500 mb-0.5">工事名</div>
                      <div className="text-sm text-gray-900 truncate">
                        {order.project?.project_name || '-'}
                      </div>
                    </div>
                  </div>

                  {/* 中央：作成者・承認者（縦並び） */}
                  <div className="mx-8">
                    {isManagerOrAdmin && order.created_by_user && (
                      <div className="mb-1">
                        <span className="text-xs text-gray-500">作成者: </span>
                        <span className="text-xs font-bold text-gray-900">
                          {order.created_by_user.name}
                        </span>
                      </div>
                    )}
                    {order.approved_at && (
                      <div>
                        <span className="text-xs text-gray-500">承認者: </span>
                        <span className="text-xs font-bold text-gray-900">
                          {order.approved_by_user?.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 右側：金額 */}
                  <div className="text-right ml-8">
                    <div className="text-xs text-gray-500 mb-0.5">金額（税込）</div>
                    <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                      ¥{Math.floor(order.total_amount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ボタンエリア（カード外・右寄せ） */}
            <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-end gap-2">
              {/* 編集ボタン: 下書きと差戻し */}
              {['draft', 'rejected'].includes(order.status) && (
                <Link
                  href={`/purchase-orders/${order.id}/edit`}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
                >
                  編集
                </Link>
              )}

              {/* 承認済み: 仕入先送付ボタン */}
              {order.status === 'approved' && (
                <div onClick={(e) => e.stopPropagation()}>
                  <SendSupplierOrderButton orderId={order.id} orderNumber={order.order_number} />
                </div>
              )}

              {/* 発注済み: 受領登録ボタン */}
              {order.status === 'ordered' && (
                <div onClick={(e) => e.stopPropagation()}>
                  <MarkReceivedButton orderId={order.id} orderNumber={order.order_number} />
                </div>
              )}

              {/* 受領済み: 支払登録ボタン（マネージャー以上のみ） */}
              {order.status === 'received' && isManagerOrAdmin && (
                <div onClick={(e) => e.stopPropagation()}>
                  <MarkPaidButton orderId={order.id} orderNumber={order.order_number} />
                </div>
              )}

              {/* PDF出力: 承認済み以降 */}
              {/* リーダーは承認済みのみ、マネージャー・管理者は全ステータスでPDF出力可能 */}
              {(() => {
                const canShowPdf = ['approved', 'ordered', 'received', 'paid'].includes(order.status)
                if (!canShowPdf) return null

                // リーダーは仕入先送付後（ordered以降）はPDF非表示
                if (currentUserRole === 'leader' && ['ordered', 'received', 'paid'].includes(order.status)) {
                  return null
                }

                return (
                  <a
                    href={`/api/purchase-orders/${order.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded hover:bg-green-700 transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    PDF出力
                  </a>
                )
              })()}

              {/* 削除ボタン: 権限に応じて表示 */}
              {(() => {
                // 承認済み以降は誰も削除できない
                if (['approved', 'ordered', 'received', 'paid'].includes(order.status)) {
                  return null
                }

                // 管理者・マネージャーは下書き・承認申請中・差戻しを削除可能
                if (['admin', 'manager'].includes(currentUserRole)) {
                  return (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DeletePurchaseOrderButton
                        orderId={order.id}
                        orderNumber={order.order_number}
                        redirectToList={false}
                      />
                    </div>
                  )
                }

                // リーダーは下書きと差戻しのみ削除可能（提出後は削除不可）
                if (currentUserRole === 'leader' && ['draft', 'rejected'].includes(order.status)) {
                  return (
                    <div onClick={(e) => e.stopPropagation()}>
                      <DeletePurchaseOrderButton
                        orderId={order.id}
                        orderNumber={order.order_number}
                        redirectToList={false}
                      />
                    </div>
                  )
                }

                return null
              })()}
            </div>
          </div>
        ))}

        {orders.length === 0 && !isLoading && (
          <div className="text-center py-12 text-gray-500">
            発注書がありません
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* FAB */}
      <PurchaseOrderPageFAB />

      {/* フィルターモーダル */}
      <PurchaseOrderFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        creatorFilter={creatorFilter}
        setCreatorFilter={setCreatorFilter}
        staffList={staffList}
        isManagerOrAdmin={isManagerOrAdmin}
        onReset={handleReset}
      />
    </>
  )
}
