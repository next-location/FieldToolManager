import { requireAuth } from '@/lib/auth/page-auth'

export default async function DebugConsumableOrdersPage() {
  const { userId, organizationId, supabase } = await requireAuth()

  // すべての発注データを取得（削除済み含む）
  const { data: allOrders, error } = await supabase
    .from('consumable_orders')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-4">消耗品発注デバッグ情報</h1>

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2">現在のユーザー情報</h2>
        <p>User ID: {userId}</p>
        <p>Organization ID: {organizationId}</p>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">全発注データ（{allOrders?.length || 0}件）</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
            <p className="text-red-800">エラー: {error.message}</p>
          </div>
        )}

        {allOrders && allOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">発注番号</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Organization ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Tool ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Deleted At</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">発注日</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allOrders.map((order: any) => (
                  <tr key={order.id} className={order.deleted_at ? 'bg-red-50' : order.organization_id !== organizationId ? 'bg-yellow-50' : ''}>
                    <td className="px-3 py-2 text-sm">{order.order_number}</td>
                    <td className="px-3 py-2 text-sm font-mono text-xs">
                      {order.organization_id}
                      {order.organization_id !== organizationId && (
                        <span className="ml-2 text-red-600">⚠️ 不一致</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm font-mono text-xs">{order.tool_id}</td>
                    <td className="px-3 py-2 text-sm">{order.status}</td>
                    <td className="px-3 py-2 text-sm">
                      {order.deleted_at ? (
                        <span className="text-red-600">削除済み: {new Date(order.deleted_at).toLocaleString('ja-JP')}</span>
                      ) : (
                        <span className="text-green-600">有効</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{order.order_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">データがありません</p>
        )}
      </div>
    </div>
  )
}
