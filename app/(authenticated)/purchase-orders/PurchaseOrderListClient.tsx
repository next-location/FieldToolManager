'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PlusIcon } from '@heroicons/react/24/outline'
import { DeletePurchaseOrderButton } from '@/components/purchase-orders/DeletePurchaseOrderButton'
import { SendOrderButton } from '@/components/purchase-orders/SendOrderButton'
import { MarkReceivedButton } from '@/components/purchase-orders/MarkReceivedButton'
import { MarkPaidButton } from '@/components/purchase-orders/MarkPaidButton'

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
  orders: PurchaseOrder[]
  suppliers: { id: string; name: string; client_code: string }[]
  projects: { id: string; name: string }[]
  currentUserRole: string
  staffList: Staff[]
}

export function PurchaseOrderListClient({
  orders: initialOrders,
  suppliers,
  projects,
  currentUserRole,
  staffList,
}: PurchaseOrderListClientProps) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [creatorSearchQuery, setCreatorSearchQuery] = useState('')
  const [showCreatorDropdown, setShowCreatorDropdown] = useState(false)

  const isManagerOrAdmin = ['manager', 'admin'].includes(currentUserRole)

  // propsが変更されたらローカル状態も更新
  useEffect(() => {
    setOrders(initialOrders)
  }, [initialOrders])

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

  // フィルタ済みデータ
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 検索クエリフィルタ
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        order.order_number.toLowerCase().includes(searchLower) ||
        order.client?.name.toLowerCase().includes(searchLower) ||
        order.project?.project_name?.toLowerCase().includes(searchLower)

      // ステータスフィルタ
      const matchesStatus =
        statusFilter === 'all' || order.status === statusFilter

      // 作成者フィルタ（マネージャー・管理者のみ）
      const matchesCreator =
        !creatorFilter || order.created_by_user?.id === creatorFilter

      return matchesSearch && matchesStatus && matchesCreator
    })
  }, [orders, searchQuery, statusFilter, creatorFilter])

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

  return (
    <>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">発注書一覧</h1>
        <Link
          href="/purchase-orders/new"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          新規作成
        </Link>
      </div>

      {/* 検索・フィルタエリア */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
          {(searchQuery || statusFilter !== 'all' || creatorFilter) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setCreatorFilter('')
                setCreatorSearchQuery('')
              }}
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

      {/* カード一覧 */}
      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div key={order.id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
            {/* クリック可能なカード本体 */}
            <div
              className="px-6 py-5 cursor-pointer hover:bg-gray-50 transition-colors relative"
              onClick={() => router.push(`/purchase-orders/${order.id}`)}
            >
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
                  <SendOrderButton orderId={order.id} orderNumber={order.order_number} />
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

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            発注書がありません
          </div>
        )}
      </div>
    </>
  )
}
