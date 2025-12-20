import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function PayablesList() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  // 未払いの発注書を取得
  const { data: orders } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:clients(name, phone, email),
      project:projects(project_name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('delivery_date', { ascending: true })

  // 買掛金がある発注書のみフィルタリング
  const payables = orders?.filter(order => order.total_amount > (order.paid_amount || 0)) || []

  // 仕入先ごとの買掛金集計
  const supplierSummary = payables.reduce((acc: any, order) => {
    const supplierId = order.supplier_id
    if (!acc[supplierId]) {
      acc[supplierId] = {
        supplier: order.supplier,
        totalAmount: 0,
        paidAmount: 0,
        payableAmount: 0,
        orderCount: 0,
        oldestDueDate: order.delivery_date
      }
    }
    acc[supplierId].totalAmount += order.total_amount
    acc[supplierId].paidAmount += (order.paid_amount || 0)
    acc[supplierId].payableAmount += (order.total_amount - (order.paid_amount || 0))
    acc[supplierId].orderCount += 1
    if (new Date(order.delivery_date) < new Date(acc[supplierId].oldestDueDate)) {
      acc[supplierId].oldestDueDate = order.delivery_date
    }
    return acc
  }, {})

  const totalPayable = payables.reduce((sum, order) => sum + (order.total_amount - (order.paid_amount || 0)), 0)
  const overduePayable = payables
    .filter(order => order.status === 'delivered' && new Date(order.delivery_date) < new Date())
    .reduce((sum, order) => sum + (order.total_amount - (order.paid_amount || 0)), 0)

  return (
    <div>
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">買掛金合計</p>
          <p className="text-2xl font-bold text-red-600">¥{totalPayable.toLocaleString()}</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">支払期限超過</p>
          <p className="text-2xl font-bold text-red-800">¥{overduePayable.toLocaleString()}</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">未払件数</p>
          <p className="text-2xl font-bold">{payables.length}件</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">仕入先数</p>
          <p className="text-2xl font-bold">{Object.keys(supplierSummary).length}社</p>
        </div>
      </div>

      {/* 仕入先別買掛金 */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">仕入先別買掛金</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">買掛金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">未払件数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最古納期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">延滞日数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(supplierSummary).map(([supplierId, summary]: [string, any]) => {
                const daysPastDue = Math.floor((Date.now() - new Date(summary.oldestDueDate).getTime()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysPastDue > 0

                return (
                  <tr key={supplierId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{summary.supplier?.name}</p>
                        {summary.supplier?.phone && (
                          <p className="text-xs text-gray-500">{summary.supplier.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-red-600">
                        ¥{summary.payableAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {summary.orderCount}件
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(summary.oldestDueDate).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOverdue ? (
                        <span className="text-red-600 font-medium">{daysPastDue}日超過</span>
                      ) : (
                        <span className="text-gray-500">期限内</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/clients/${supplierId}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        詳細
                      </Link>
                      <button className="text-green-600 hover:text-green-900">
                        支払予定
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 発注書明細 */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">未払発注書一覧</h2>
          <Link
            href="/purchase-orders"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            すべての発注書を見る →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">納期</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">未払額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payables.map((order) => {
                const payableAmount = order.total_amount - (order.paid_amount || 0)
                const isDelivered = order.status === 'delivered'
                const isOverdue = isDelivered && new Date(order.delivery_date) < new Date()
                const daysPastDue = Math.floor((Date.now() - new Date(order.delivery_date).getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <tr key={order.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.supplier?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {order.project?.project_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(order.order_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(order.delivery_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ¥{order.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-600">
                      ¥{payableAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {order.status === 'ordered' ? (
                        <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          発注済
                        </span>
                      ) : order.status === 'delivered' ? (
                        isOverdue ? (
                          <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            納品済・{daysPastDue}日超過
                          </span>
                        ) : (
                          <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            納品済
                          </span>
                        )
                      ) : (
                        <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          {order.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/purchase-orders/${order.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        詳細
                      </Link>
                      {isDelivered && (
                        <Link
                          href={`/payments/new?type=payment&purchase_order_id=${order.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          支払登録
                        </Link>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {payables.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              買掛金はありません
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function PayablesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // 管理者のみアクセス可能
  if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">買掛金管理</h1>
        <p className="text-gray-600">
          未払いの発注書と買掛金の管理を行います
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <PayablesList />
      </Suspense>
      </div>
    </div>
  )
}
