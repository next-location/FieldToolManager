'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ConsumableOrderWithRelations } from '@/types/consumable-orders'
import {
  markAsOrdered,
  markAsDelivered,
  markAsCancelled,
} from './actions'

interface Props {
  order: ConsumableOrderWithRelations
  userId: string
}

export default function OrderDetailActions({ order, userId }: Props) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)

  const handleMarkAsOrdered = async () => {
    if (!confirm('ステータスを「発注済み」に変更しますか？')) return

    setIsProcessing(true)
    setError(null)

    try {
      await markAsOrdered(order.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ステータスの更新に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleMarkAsDelivered = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    formData.append('order_id', order.id)
    formData.append('user_id', userId)

    try {
      await markAsDelivered(formData)
      setShowDeliveryModal(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '納品処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCancelOrder = async () => {
    if (!confirm('この発注をキャンセルしますか？この操作は取り消せません。')) return

    setIsProcessing(true)
    setError(null)

    try {
      await markAsCancelled(order.id)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'キャンセル処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">アクション</h3>
          <div className="mt-5 space-y-3">
            {/* 発注書作成ボタン - 下書き中または発注済みの場合に表示 */}
            {(order.status === '下書き中' || order.status === '発注済み') && (
              <Link
                href={`/purchase-orders/new?from=consumable&consumable_order_id=${order.id}`}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                📄 正式な発注書を作成
              </Link>
            )}

            {order.status === '下書き中' && (
              <>
                <button
                  onClick={handleMarkAsOrdered}
                  disabled={isProcessing}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  発注済みにする
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isProcessing}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  発注をキャンセル
                </button>
              </>
            )}

            {order.status === '発注済み' && (
              <>
                <button
                  onClick={() => setShowDeliveryModal(true)}
                  disabled={isProcessing}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  納品完了処理
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isProcessing}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  発注をキャンセル
                </button>
              </>
            )}

            {order.status === '納品済み' && (
              <p className="text-sm text-gray-500">この発注は納品済みです。</p>
            )}

            {order.status === 'キャンセル' && (
              <p className="text-sm text-gray-500">この発注はキャンセルされました。</p>
            )}
          </div>
        </div>
      </div>

      {/* 納品完了モーダル */}
      {showDeliveryModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeliveryModal(false)} />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleMarkAsDelivered}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    納品完了処理
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="actual_delivery_date" className="block text-sm font-medium text-gray-700">
                        実際の納品日 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="actual_delivery_date"
                        id="actual_delivery_date"
                        required
                        defaultValue={new Date().toISOString().split('T')[0]}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label htmlFor="delivery_notes" className="block text-sm font-medium text-gray-700">
                        納品メモ
                      </label>
                      <textarea
                        name="delivery_notes"
                        id="delivery_notes"
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="納品に関する特記事項など"
                      />
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>注意:</strong> 納品完了処理を行うと、倉庫在庫に自動的に追加されます。
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isProcessing ? '処理中...' : '納品完了'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeliveryModal(false)}
                    disabled={isProcessing}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    キャンセル
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
