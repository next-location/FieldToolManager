import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { QRCodePrint } from '@/components/qr/QRCodePrint'

export default async function WarehouseLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userRole)) {
    redirect('/')
  }

  // 倉庫位置情報を取得
  const { data: location, error } = await supabase
    .from('warehouse_locations')
    .select('*')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !location) {
    redirect('/warehouse-locations')
  }

  // この位置に保管されている道具を取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(`
      *,
      tool:tools (
        id,
        name,
        tool_categories (name)
      )
    `)
    .eq('warehouse_location_id', id)
    .eq('current_location', 'warehouse')
    .is('deleted_at', null)
    .order('serial_number')

  // この位置に保管されている消耗品を取得
  const { data: consumableInventory } = await supabase
    .from('consumable_inventory')
    .select(`
      *,
      tool:tools (
        id,
        name,
        unit,
        tool_categories (name)
      )
    `)
    .eq('warehouse_location_id', id)
    .eq('location_type', 'warehouse')
    .gt('quantity', 0)

  const toolCount = toolItems?.length || 0
  const consumableCount = consumableInventory?.length || 0

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/warehouse-locations"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 倉庫位置一覧に戻る
          </Link>
        </div>

        {/* 基本情報 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                倉庫位置詳細
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                ID: {location.id.substring(0, 8)}...
              </p>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">位置コード</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {location.code}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">表示名</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {location.display_name}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">階層レベル</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {location.level}
                </dd>
              </div>

              {location.description && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">説明</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {location.description}
                  </dd>
                </div>
              )}

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">ステータス</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {location.is_active ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      有効
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      無効
                    </span>
                  )}
                </dd>
              </div>

              {location.qr_code && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">QRコード</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <QRCodePrint
                      value={location.qr_code}
                      itemName={location.display_name}
                      itemCode={`倉庫位置: ${location.code}`}
                      itemType="倉庫位置"
                      size={200}
                    />
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* 保管中の道具 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              保管中の道具（{toolCount}台）
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              この位置に保管されている個別管理道具
            </p>
          </div>
          <div className="border-t border-gray-200">
            {toolItems && toolItems.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {toolItems.map((item) => {
                  const tool = item.tool as any
                  return (
                    <li key={item.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {tool?.name} #{item.serial_number}
                            </p>
                            <span className="ml-3 text-xs text-gray-500">
                              カテゴリ: {tool?.tool_categories?.name || '未設定'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            ステータス: {
                              item.status === 'available' ? '利用可能' :
                              item.status === 'in_use' ? '使用中' :
                              item.status === 'maintenance' ? 'メンテナンス中' :
                              item.status === 'lost' ? '紛失' : item.status
                            }
                          </div>
                        </div>
                        <div>
                          <Link
                            href={`/tools/${tool?.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            詳細 →
                          </Link>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                保管中の道具がありません
              </div>
            )}
          </div>
        </div>

        {/* 保管中の消耗品 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              保管中の消耗品（{consumableCount}種類）
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              この位置に保管されている消耗品
            </p>
          </div>
          <div className="border-t border-gray-200">
            {consumableInventory && consumableInventory.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {consumableInventory.map((inv) => {
                  const tool = inv.tool as any
                  return (
                    <li key={inv.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <p className="text-sm font-medium text-gray-900">
                              {tool?.name}
                            </p>
                            <span className="ml-3 text-xs text-gray-500">
                              カテゴリ: {tool?.tool_categories?.name || '未設定'}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            最終更新: {new Date(inv.updated_at).toLocaleString('ja-JP')}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900">
                              {inv.quantity}
                              <span className="ml-1 text-sm font-normal text-gray-500">
                                {tool?.unit}
                              </span>
                            </div>
                          </div>
                          <Link
                            href={`/consumables/${tool?.id}`}
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            詳細 →
                          </Link>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                保管中の消耗品がありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
