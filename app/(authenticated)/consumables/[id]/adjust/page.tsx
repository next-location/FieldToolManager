import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { AdjustmentForm } from './AdjustmentForm'

export default async function ConsumableAdjustPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()


  // 消耗品情報取得
  const { data: consumable } = await supabase
    .from('tools')
    .select('id, name, unit, minimum_stock')
    .eq('id', id)
    .eq('organization_id', organizationId)
    .eq('management_type', 'consumable')
    .is('deleted_at', null)
    .single()

  if (!consumable) {
    redirect('/consumables')
  }

  // 倉庫在庫取得
  const { data: warehouseInventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('tool_id', id)
    .eq('location_type', 'warehouse')
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <Link
            href={`/consumables/${id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-4 inline-block"
          >
            ← 消耗品詳細に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">在庫調整：{consumable.name}</h1>
          <p className="mt-1 text-sm text-gray-500">
            現在の倉庫在庫：{warehouseInventory?.quantity || 0} {consumable.unit}
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <AdjustmentForm
              consumableId={id}
              consumableName={consumable.name}
              unit={consumable.unit}
              currentQuantity={warehouseInventory?.quantity || 0}
              userRole={userRole}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
