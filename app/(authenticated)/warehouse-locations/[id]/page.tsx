import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { QRCodePrint } from '@/components/qr/QRCodePrint'
import { DeleteWarehouseLocationButton } from '@/components/warehouse-locations/DeleteWarehouseLocationButton'

export default async function WarehouseLocationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得
  // 全ユーザーが閲覧可能（編集・削除は管理者のみ）

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
    .order('tool_id')
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
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                {location.display_name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                位置コード: {location.code}
              </p>
            </div>
            {['admin', 'super_admin'].includes(userRole) && (
              <div className="flex gap-3">
                <Link
                  href={`/warehouse-locations/${location.id}/edit`}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  編集
                </Link>
                <DeleteWarehouseLocationButton
                  locationId={location.id}
                  locationName={location.display_name}
                  hasTools={toolCount > 0}
                  hasConsumables={consumableCount > 0}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">階層レベル</p>
              <p className="text-base text-gray-900">{location.level}</p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">ステータス</p>
              <div>
                {location.is_active ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    有効
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                    無効
                  </span>
                )}
              </div>
            </div>

            {location.description && (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-600 mb-1">説明</p>
                <p className="text-base text-gray-900">{location.description}</p>
              </div>
            )}
          </div>

          {location.qr_code && (
            <div className="border-t pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">QRコード</h3>
              <QRCodePrint
                value={location.qr_code}
                itemName={location.display_name}
                itemCode={`倉庫位置: ${location.code}`}
                itemType="倉庫位置"
                size={200}
              />
            </div>
          )}
        </div>

        {/* 保管中の道具 - モバイル対応カード形式 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              保管中の道具（{toolCount}台）
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              この位置に保管されている個別管理道具
            </p>
          </div>
          <div className="px-4 pb-4">
            {toolItems && toolItems.length > 0 ? (
              <div className="space-y-3">
                {toolItems.map((item) => {
                  const tool = item.tool as any
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Link
                            href={`/tools/${tool?.id}`}
                            className="text-base font-medium text-blue-600 hover:text-blue-800"
                          >
                            {tool?.name}
                          </Link>
                          <p className="text-sm text-gray-600 mt-1">
                            個別番号: #{item.serial_number}
                          </p>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 ${
                          item.status === 'available'
                            ? 'bg-green-100 text-green-800'
                            : item.status === 'in_use'
                            ? 'bg-blue-100 text-blue-800'
                            : item.status === 'maintenance'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.status === 'available' ? '利用可能' :
                           item.status === 'in_use' ? '使用中' :
                           item.status === 'maintenance' ? 'メンテナンス中' :
                           item.status === 'lost' ? '紛失' : item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          カテゴリ: {tool?.tool_categories?.name || '未設定'}
                        </p>
                        <Link
                          href={`/tool-items/${item.id}`}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          詳細 →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                保管中の道具がありません
              </div>
            )}
          </div>
        </div>

        {/* 保管中の消耗品 - モバイル対応カード形式 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              保管中の消耗品（{consumableCount}種類）
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              この位置に保管されている消耗品
            </p>
          </div>
          <div className="px-4 pb-4">
            {consumableInventory && consumableInventory.length > 0 ? (
              <div className="space-y-3">
                {consumableInventory.map((inv) => {
                  const tool = inv.tool as any
                  return (
                    <div key={inv.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Link
                            href={`/consumables/${tool?.id}`}
                            className="text-base font-medium text-blue-600 hover:text-blue-800"
                          >
                            {tool?.name}
                          </Link>
                          <p className="text-sm text-gray-500 mt-1">
                            カテゴリ: {tool?.tool_categories?.name || '未設定'}
                          </p>
                        </div>
                        <div className="text-right ml-2">
                          <div className="text-lg font-bold text-gray-900">
                            {inv.quantity}
                            <span className="ml-1 text-sm font-normal text-gray-500">
                              {tool?.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-gray-500">
                          最終更新: {new Date(inv.updated_at).toLocaleDateString('ja-JP')}
                        </p>
                        <Link
                          href={`/consumables/${tool?.id}`}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          詳細 →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500">
                保管中の消耗品がありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
