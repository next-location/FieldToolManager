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
    <div className="space-y-3">
      {/* カードリスト表示（横幅いっぱい・縦1列） */}
      {orders.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-8 text-center">
          <p className="text-gray-500">発注履歴がありません</p>
        </div>
      ) : (
        orders.map((order) => (
          <Link
            key={order.id}
            href={`/consumables/orders/${order.id}`}
            className="block bg-white shadow rounded-lg hover:shadow-lg transition-shadow"
          >
            {/* スマホ表示: 縦積み */}
            <div className="sm:hidden p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">
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

              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-900">
                  {order.tools?.name || '-'}
                </p>

                <div className="space-y-1.5 text-xs">
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

            </div>

            {/* PC表示: 横並び（横幅いっぱいに使用） */}
            <div className="hidden sm:flex items-center px-6 py-4 gap-4">
              {/* 左側: 発注番号・消耗品名 */}
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-gray-900 truncate">
                  {order.tools?.name || '-'}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {order.order_number}
                </p>
              </div>

              {/* 中央: 数量・金額 */}
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">数量</p>
                  <p className="text-base font-semibold text-gray-900">{order.quantity}個</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-1">金額</p>
                  <p className="text-base font-bold text-gray-900">
                    {order.total_price
                      ? `¥${order.total_price.toLocaleString()}`
                      : '-'}
                  </p>
                </div>
              </div>

              {/* 右側: 日付 */}
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">発注日</p>
                <p className="text-sm text-gray-900">
                  {new Date(order.order_date).toLocaleDateString('ja-JP')}
                </p>
                {order.expected_delivery_date && (
                  <>
                    <p className="text-xs text-gray-500 mt-2 mb-1">納品予定</p>
                    <p className="text-sm text-gray-900">
                      {new Date(order.expected_delivery_date).toLocaleDateString('ja-JP')}
                    </p>
                  </>
                )}
              </div>

              {/* ステータス・担当者（横並び） */}
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
                {order.ordered_by_user && (
                  <p className="text-xs text-gray-500 whitespace-nowrap">
                    {order.ordered_by_user.name}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  )
}
