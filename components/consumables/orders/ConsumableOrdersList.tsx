'use client'

import Link from 'next/link'
import type { ConsumableOrderWithRelations } from '@/types/consumable-orders'

interface ConsumableOrdersListProps {
  orders: ConsumableOrderWithRelations[]
}

export default function ConsumableOrdersList({ orders }: ConsumableOrdersListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case '下書き中':
        return 'bg-yellow-100 text-yellow-800'
      case '発注済み':
        return 'bg-blue-100 text-blue-800'
      case '納品済み':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* カードリスト表示（PC・スマホ共通） */}
      {orders.length === 0 ? (
        <div className="col-span-full bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">発注履歴がありません</p>
        </div>
      ) : (
        orders.map((order) => (
          <Link
            key={order.id}
            href={`/consumables/orders/${order.id}`}
            className="block bg-white shadow rounded-lg p-4 sm:p-5 hover:shadow-lg transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm sm:text-base font-medium text-gray-900">
                  {order.order_number}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(order.order_date).toLocaleDateString('ja-JP')}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  order.status
                )}`}
              >
                {order.status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm sm:text-base font-semibold text-gray-900">
                  {order.tools?.name || '-'}
                </p>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">数量</span>
                  <span className="font-medium text-gray-900">{order.quantity}個</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">金額</span>
                  <span className="font-semibold text-gray-900">
                    {order.total_price
                      ? `¥${order.total_price.toLocaleString()}`
                      : '-'}
                  </span>
                </div>
                {order.expected_delivery_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">納品予定</span>
                    <span className="font-medium text-gray-900">
                      {new Date(order.expected_delivery_date).toLocaleDateString('ja-JP')}
                    </span>
                  </div>
                )}
                {order.ordered_by_user && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">発注者</span>
                    <span className="font-medium text-gray-900">
                      {order.ordered_by_user.name}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-end">
              <span className="text-xs sm:text-sm text-blue-600 font-medium">
                詳細を見る →
              </span>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
