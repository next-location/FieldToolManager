import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import type { ConsumableOrderWithRelations } from '@/types/consumable-orders'
import ConsumableOrdersPageFAB from '@/components/consumables/orders/ConsumableOrdersPageFAB'
import ConsumableOrdersList from '@/components/consumables/orders/ConsumableOrdersList'

export default async function ConsumableOrdersPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報と組織IDを取得

  // 発注一覧を取得（リレーション込み）
  const { data: orders } = await supabase
    .from('consumable_orders')
    .select(`
      *,
      tools:tool_id (
        id,
        name,
        model_number,
        manufacturer
      ),
      ordered_by_user:ordered_by (
        id,
        name,
        email
      ),
      received_by_user:received_by (
        id,
        name,
        email
      )
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('order_date', { ascending: false })

  const ordersWithRelations = orders as unknown as ConsumableOrderWithRelations[] || []

  // 統計情報を計算
  const stats = {
    total: ordersWithRelations.length,
    pending: ordersWithRelations.filter((o) => o.status === '下書き中').length,
    ordered: ordersWithRelations.filter((o) => o.status === '発注済み').length,
    delivered: ordersWithRelations.filter((o) => o.status === '納品済み').length,
    cancelled: ordersWithRelations.filter((o) => o.status === 'キャンセル').length,
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6 space-y-6">
        {/* ヘッダー */}
        <div className="flex justify-between items-center">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">消耗品発注管理</h1>
          {/* PC表示: 新規発注ボタン */}
          <Link
            href="/consumables/orders/new"
            className="hidden sm:inline-flex px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + 新規発注
          </Link>
        </div>

      {/* 統計情報 - スマホは3段折り返し、PCはグリッド */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* 総発注数 - スマホで1行目全幅 */}
        <div className="col-span-2 sm:col-span-1 bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">総発注数</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.total}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 下書き中 - スマホで2行目左 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-yellow-100 flex items-center justify-center">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-yellow-500"></div>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">下書き中</dt>
                  <dd className="text-lg font-semibold text-yellow-600">{stats.pending}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 発注済み - スマホで2行目右 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-blue-100 flex items-center justify-center">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-blue-500"></div>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">発注済み</dt>
                  <dd className="text-lg font-semibold text-blue-600">{stats.ordered}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* 納品済み - スマホで3行目左 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-green-100 flex items-center justify-center">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-green-500"></div>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">納品済み</dt>
                  <dd className="text-lg font-semibold text-green-600">{stats.delivered}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* キャンセル - スマホで3行目右 */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-4 sm:p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-gray-100 flex items-center justify-center">
                  <div className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full bg-gray-500"></div>
                </div>
              </div>
              <div className="ml-3 sm:ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">キャンセル</dt>
                  <dd className="text-lg font-semibold text-gray-600">{stats.cancelled}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 発注一覧 */}
      <ConsumableOrdersList orders={ordersWithRelations} />

      {/* スマホのみ: FABボタン */}
      <ConsumableOrdersPageFAB />
      </div>
    </div>
  )
}
