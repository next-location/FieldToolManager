import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MovementForm } from './MovementForm'

export default async function ConsumableMovePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/')
  }

  // 消耗品情報を取得
  const { data: consumable } = await supabase
    .from('tools')
    .select('id, name, unit, minimum_stock')
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .eq('management_type', 'consumable')
    .single()

  if (!consumable) {
    redirect('/consumables')
  }

  // 組織設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('consumable_movement_tracking')
    .eq('id', userData?.organization_id)
    .single()

  // 現在の在庫状況を取得
  const { data: inventories } = await supabase
    .from('consumable_inventory')
    .select('*, sites(id, name)')
    .eq('tool_id', id)
    .eq('organization_id', userData?.organization_id)

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, is_active')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 倉庫在庫
  const warehouseInventory =
    inventories?.find((inv) => inv.location_type === 'warehouse') || null

  // 現場在庫一覧
  const siteInventories =
    inventories?.filter((inv) => inv.location_type === 'site') || []

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href={`/consumables/${id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 消耗品詳細に戻る
          </Link>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">
              {consumable.name} - 移動
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              倉庫と現場の間で消耗品を移動します
            </p>
          </div>

          {/* 現在の在庫状況 */}
          <div className="px-4 py-5 sm:p-6 border-b border-gray-200 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-900 mb-3">
              現在の在庫状況
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">倉庫:</span>
                <span className="font-medium">
                  {warehouseInventory?.quantity || 0} {consumable.unit}
                </span>
              </div>
              {siteInventories.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-2">
                    <p className="text-xs text-gray-500 mb-2">現場別在庫:</p>
                    {siteInventories.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex justify-between text-sm pl-4"
                      >
                        <span className="text-gray-600">
                          {(inv.sites as any)?.name || '不明な現場'}:
                        </span>
                        <span className="font-medium">
                          {inv.quantity} {consumable.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <MovementForm
            consumableId={consumable.id}
            consumableName={consumable.name}
            unit={consumable.unit}
            warehouseInventory={warehouseInventory}
            siteInventories={siteInventories}
            sites={sites || []}
            trackingMode={
              organization?.consumable_movement_tracking || 'quantity'
            }
          />
        </div>
      </div>
    </div>
  )
}
