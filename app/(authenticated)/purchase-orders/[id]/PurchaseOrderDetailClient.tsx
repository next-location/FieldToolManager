'use client'

import { useState } from 'react'
import { PurchaseOrderWithRelations } from '@/types/purchase-orders'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline'
import { PurchaseOrderHistoryTimeline, PurchaseOrderActionType } from '@/components/purchase-orders/PurchaseOrderHistoryTimeline'

interface Payment {
  id: string
  payment_date: string
  amount: number
  payment_method: string
  reference_number?: string
  notes?: string
  recorded_by_user?: { id: string; name: string }
}

interface PurchaseOrderHistoryItem {
  id: string
  action_type: PurchaseOrderActionType
  performed_by_name: string
  notes?: string
  created_at: string
}

interface PurchaseOrderDetailClientProps {
  order: PurchaseOrderWithRelations
  history: PurchaseOrderHistoryItem[]
  payments: Payment[]
  currentUserId: string
  currentUserRole: string
}

export function PurchaseOrderDetailClient({
  order,
  history,
  payments,
  currentUserId,
  currentUserRole,
}: PurchaseOrderDetailClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const isCreator = order.created_by === currentUserId
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)

  // 承認権限の判定: 管理者とマネージャーのみ
  const canApprove = (() => {
    // 作成者は自分の発注書を承認できない
    if (isCreator) return false

    // 管理者とマネージャーのみ承認可能
    return ['admin', 'manager'].includes(currentUserRole)
  })()

  const handleSubmit = async () => {
    if (!confirm('承認申請を送信しますか？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/submit`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '承認申請に失敗しました')
      }

      alert('承認申請を送信しました')
      router.refresh()
    } catch (error) {
      console.error('Error submitting order:', error)
      alert(error instanceof Error ? error.message : '承認申請に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: '承認しました' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '承認に失敗しました')
      }

      alert('発注書を承認しました')
      setShowApprovalModal(false)
      router.refresh()
    } catch (error) {
      console.error('Error approving order:', error)
      alert(error instanceof Error ? error.message : '承認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('差戻し理由を入力してください')
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: rejectReason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '差戻しに失敗しました')
      }

      alert('発注書を差戻しました')
      setShowRejectModal(false)
      setRejectReason('')
      router.refresh()
    } catch (error) {
      console.error('Error rejecting order:', error)
      alert(error instanceof Error ? error.message : '差戻しに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadPDF = () => {
    window.open(`/api/purchase-orders/${order.id}/pdf`, '_blank')
  }

  const handleDelete = async () => {
    if (!confirm(`発注書「${order.order_number}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '削除に失敗しました')
      }

      alert('発注書を削除しました')
      router.push('/purchase-orders')
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      alert(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!confirm('仕入先に発注書を送付しますか？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '送付に失敗しました')
      }

      alert('仕入先に発注書を送付しました')
      router.refresh()
    } catch (error) {
      console.error('Error sending order:', error)
      alert(error instanceof Error ? error.message : '送付に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkReceived = async () => {
    if (!confirm('商品・サービスを受領しましたか？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/mark-received`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '受領登録に失敗しました')
      }

      alert('受領登録しました')
      router.refresh()
    } catch (error) {
      console.error('Error marking as received:', error)
      alert(error instanceof Error ? error.message : '受領登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!confirm('支払を完了しましたか？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${order.id}/mark-paid`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '支払登録に失敗しました')
      }

      alert('支払登録しました')
      router.refresh()
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert(error instanceof Error ? error.message : '支払登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-800' },
      submitted: { label: '承認申請中', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: '承認済み', className: 'bg-green-100 text-green-800' },
      rejected: { label: '差戻し', className: 'bg-red-100 text-red-800' },
      ordered: { label: '発注済み', className: 'bg-blue-100 text-blue-800' },
      received: { label: '納品済み', className: 'bg-green-100 text-green-800' },
      paid: { label: '支払済み', className: 'bg-indigo-100 text-indigo-800' },
    }
    const { label, className } = config[status as keyof typeof config] || config.draft
    return <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${className}`}>{label}</span>
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      {/* ヘッダー */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">発注書詳細</h1>
          <p className="text-gray-600">{order.order_number}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 下書き状態: 編集のみ可能 */}
          {order.status === 'draft' && (
            <Link
              href={`/purchase-orders/${order.id}/edit`}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              編集
            </Link>
          )}

          {/* 差戻し状態: 編集可能 */}
          {order.status === 'rejected' && (
            <Link
              href={`/purchase-orders/${order.id}/edit`}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              編集
            </Link>
          )}

          {/* 承認申請中: 承認・差戻しボタン（承認者のみ） */}
          {order.status === 'submitted' && canApprove && (
            <>
              <button
                onClick={() => setShowApprovalModal(true)}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                承認
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
              >
                差戻し
              </button>
            </>
          )}

          {/* 承認済み: 仕入先送付ボタン */}
          {order.status === 'approved' && (
            <button
              onClick={handleSend}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 disabled:opacity-50"
            >
              仕入先送付
            </button>
          )}

          {/* 発注済み: 受領登録ボタン */}
          {order.status === 'ordered' && (
            <button
              onClick={handleMarkReceived}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              受領登録
            </button>
          )}

          {/* 受領済み: 支払登録ボタン（マネージャー以上のみ） */}
          {order.status === 'received' && ['manager', 'admin', 'super_admin'].includes(currentUserRole) && (
            <button
              onClick={handleMarkPaid}
              disabled={loading}
              className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 disabled:opacity-50"
            >
              支払登録
            </button>
          )}

          {/* PDFボタン: 承認済み以降のみ表示 */}
          {['approved', 'ordered', 'received', 'paid'].includes(order.status) && (
            <button
              onClick={handleDownloadPDF}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
            >
              PDF出力
            </button>
          )}

          {/* 削除ボタン: 下書きと差戻しのみ（管理者・マネージャーは全て可能、リーダーは提出前のみ） */}
          {(() => {
            // 承認済み以降は誰も削除できない
            if (['approved', 'ordered', 'received', 'paid'].includes(order.status)) {
              return null
            }

            // 管理者・マネージャーは下書き・承認申請中・差戻しを削除可能
            if (['admin', 'manager'].includes(currentUserRole)) {
              return (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  削除
                </button>
              )
            }

            // リーダーは下書きと差戻しのみ削除可能（提出後は削除不可）
            if (currentUserRole === 'leader' && ['draft', 'rejected'].includes(order.status)) {
              return (
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  削除
                </button>
              )
            }

            return null
          })()}

          <Link
            href="/purchase-orders"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            一覧に戻る
          </Link>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">基本情報</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">仕入先</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {order.client?.name}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">工事</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {order.project?.name || '-'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">発注日</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(order.order_date).toLocaleDateString('ja-JP')}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">納期</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {order.delivery_date
                  ? new Date(order.delivery_date).toLocaleDateString('ja-JP')
                  : '-'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">金額</dt>
              <dd className="mt-1 text-sm font-medium text-gray-900 sm:mt-0 sm:col-span-2">
                ¥{Number(order.total_amount).toLocaleString()}（税込）
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">作成者</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {order.created_by_user?.name}
              </dd>
            </div>
            {order.approved_by_user && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">承認者</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {order.approved_by_user.name} (
                  {order.approved_at && new Date(order.approved_at).toLocaleDateString('ja-JP')})
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* 明細 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">発注明細</h3>
        </div>
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  品目
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  摘要
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  数量
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  単価
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  金額
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items
                ?.sort((a, b) => a.display_order - b.display_order)
                .map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.item_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.description || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {Number(item.quantity).toLocaleString()} {item.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      ¥{Number(item.unit_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      ¥{Number(item.amount).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot className="bg-gray-50">
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  小計
                </td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                  ¥{Number(order.subtotal).toLocaleString()}
                </td>
              </tr>
              <tr>
                <td colSpan={4} className="px-6 py-4 text-sm text-gray-900 text-right">
                  消費税
                </td>
                <td className="px-6 py-4 text-sm text-gray-900 text-right">
                  ¥{Number(order.tax_amount).toLocaleString()}
                </td>
              </tr>
              <tr className="border-t-2 border-gray-300">
                <td colSpan={4} className="px-6 py-4 text-base font-bold text-gray-900 text-right">
                  合計
                </td>
                <td className="px-6 py-4 text-base font-bold text-gray-900 text-right">
                  ¥{Number(order.total_amount).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 支払記録 */}
      {payments.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">支払記録</h3>
            <p className="mt-1 text-sm text-gray-500">
              支払済み: ¥{totalPaid.toLocaleString()} / 残額: ¥
              {(Number(order.total_amount) - totalPaid).toLocaleString()}
            </p>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    支払日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    支払方法
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    登録者
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(payment.payment_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ¥{Number(payment.amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.payment_method}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.recorded_by_user?.name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 操作履歴 */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">操作履歴</h2>
        <PurchaseOrderHistoryTimeline history={history} />
      </div>

      {/* 承認モーダル */}
      {showApprovalModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">発注書を承認しますか？</h3>
            <p className="text-sm text-gray-500 mb-6">
              承認後は発注書の内容を変更できません。
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? '処理中...' : '承認する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 差戻しモーダル */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">発注書を差戻します</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                差戻し理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="差戻しの理由を入力してください"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectReason('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleReject}
                disabled={loading || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? '処理中...' : '差戻す'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
