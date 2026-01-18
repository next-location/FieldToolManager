import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { ConsumableBulkMovementForm } from './ConsumableBulkMovementForm'

export default async function ConsumableBulkMovementPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 消耗品マスターを取得
  const { data: consumables } = await supabase
    .from('tools')
    .select('id, name, model_number, unit, qr_code')
    .eq('organization_id', organizationId)
    .eq('management_type', 'consumable')
    .order('name')

  // 消耗品在庫を取得
  const { data: inventoriesRaw } = await supabase
    .from('consumable_inventory')
    .select(`
      tool_id,
      location_type,
      site_id,
      warehouse_location_id,
      quantity,
      site:sites!consumable_inventory_site_id_fkey (id, name),
      warehouse_location:warehouse_locations!consumable_inventory_warehouse_location_id_fkey (id, code, display_name)
    `)
    .eq('organization_id', organizationId)
    .gt('quantity', 0)

  // 型を整形
  const inventories = (inventoriesRaw || []).map((inv: any) => ({
    tool_id: inv.tool_id,
    location_type: inv.location_type,
    site_id: inv.site_id,
    warehouse_location_id: inv.warehouse_location_id,
    quantity: inv.quantity,
    site: Array.isArray(inv.site) ? inv.site[0] : inv.site,
    warehouse_location: Array.isArray(inv.warehouse_location) ? inv.warehouse_location[0] : inv.warehouse_location,
  }))

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pt-3 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">消耗品移動</h1>
          <p className="mt-1 text-sm text-gray-600">
            複数の消耗品を選択して、まとめて移動できます。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ConsumableBulkMovementForm
            consumables={consumables || []}
            sites={sites || []}
            inventories={inventories || []}
          />
        </div>
      </div>
    </div>
  )
}
