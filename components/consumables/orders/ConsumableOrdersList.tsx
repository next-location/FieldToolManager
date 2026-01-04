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
    <>
      {/* PC表示: テーブル */}
      <div className="hidden sm:block bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                発注番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                消耗品名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                発注日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                数量
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                合計金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                納品予定日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                発注者
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  発注履歴がありません
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {order.order_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.tools?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(order.order_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.quantity}個
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {order.total_price
                      ? `¥${order.total_price.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.expected_delivery_date
                      ? new Date(order.expected_delivery_date).toLocaleDateString('ja-JP')
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {order.ordered_by_user?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      href={`/consumables/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* モバイル表示: カードリスト */}
      <div className="sm:hidden space-y-4">
        {orders.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-8 text-center">
            <p className="text-gray-500">発注履歴がありません</p>
          </div>
        ) : (
          orders.map((order) => (
            <Link
              key={order.id}
              href={`/consumables/orders/${order.id}`}
              className="block bg-white shadow rounded-lg p-4 hover:shadow-md transition-shadow"
            >
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
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    order.status
                  )}`}
                >
                  {order.status}
                </span>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    {order.tools?.name || '-'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">数量: </span>
                    <span className="font-medium text-gray-900">{order.quantity}個</span>
                  </div>
                  <div>
                    <span className="text-gray-500">金額: </span>
                    <span className="font-medium text-gray-900">
                      {order.total_price
                        ? `¥${order.total_price.toLocaleString()}`
                        : '-'}
                    </span>
                  </div>
                  {order.expected_delivery_date && (
                    <div className="col-span-2">
                      <span className="text-gray-500">納品予定: </span>
                      <span className="font-medium text-gray-900">
                        {new Date(order.expected_delivery_date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  )}
                  {order.ordered_by_user && (
                    <div className="col-span-2">
                      <span className="text-gray-500">発注者: </span>
                      <span className="font-medium text-gray-900">
                        {order.ordered_by_user.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                <span className="text-xs text-blue-600 font-medium">
                  詳細を見る →
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  )
}
