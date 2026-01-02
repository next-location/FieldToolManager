import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { BulkMovementForm } from './BulkMovementForm'

export default async function BulkMovementPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 道具個別アイテムを取得（削除されていないもの）
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(`
      id,
      serial_number,
      qr_code,
      current_location,
      current_site_id,
      warehouse_location_id,
      status,
      tools (
        id,
        name,
        model_number
      )
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('serial_number')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 倉庫位置一覧を取得
  const { data: warehouseLocations } = await supabase
    .from('warehouse_locations')
    .select('id, code, display_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('code')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">道具一括移動</h1>
          <p className="mt-1 text-sm text-gray-600">
            移動先を選択してから、道具を連続でスキャンまたは選択して一括移動できます。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BulkMovementForm
            toolItems={toolItems || []}
            sites={sites || []}
            warehouseLocations={warehouseLocations || []}
          />
        </div>
      </div>
    </div>
  )
}
