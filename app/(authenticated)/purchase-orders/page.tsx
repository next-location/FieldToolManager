import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function PurchaseOrderList() {
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

  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:clients(name),
      project:projects(project_name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">発注書一覧</h2>
        <Link
          href="/purchase-orders/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
        >
          新規発注書作成
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                発注番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                仕入先
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工事名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                発注日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                納期
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額（税込）
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
            {purchaseOrders?.map((order) => (
              <tr key={order.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {order.order_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {order.supplier?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.project?.project_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(order.order_date).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.delivery_date
                    ? new Date(order.delivery_date).toLocaleDateString('ja-JP')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  ¥{order.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                    order.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : order.status === 'ordered'
                      ? 'bg-blue-100 text-blue-800'
                      : order.status === 'partially_received'
                      ? 'bg-yellow-100 text-yellow-800'
                      : order.status === 'received'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status === 'draft' ? '下書き'
                      : order.status === 'ordered' ? '発注済'
                      : order.status === 'partially_received' ? '一部納品'
                      : order.status === 'received' ? '納品済'
                      : 'キャンセル'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/purchase-orders/${order.id}`}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    詳細
                  </Link>
                  {order.status === 'draft' && (
                    <Link
                      href={`/purchase-orders/${order.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      編集
                    </Link>
                  )}
                  <button className="text-green-600 hover:text-green-900 mr-3">
                    PDF
                  </button>
                  {order.status === 'received' && (
                    <Link
                      href={`/payments/new?purchase_order_id=${order.id}`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      支払登録
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!purchaseOrders || purchaseOrders.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            発注書データがありません
          </div>
        )}
      </div>
    </div>
  )
}

export default async function PurchaseOrdersPage() {
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
  if (!['admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">発注書管理</h1>
        <p className="text-gray-600">
          発注書の作成・管理を行います
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <PurchaseOrderList />
      </Suspense>
    </div>
  )
}