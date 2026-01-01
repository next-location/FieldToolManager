import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { ConsumableBulkMovementForm } from './ConsumableBulkMovementForm'

export default async function ConsumableBulkMovementPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 消耗品マスターを取得
  const { data: consumables } = await supabase
    .from('tools')
    .select('id, name, model_number, unit')
    .eq('organization_id', organizationId)
    .eq('management_type', 'consumable')
    .order('name')

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
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">消耗品一括移動</h1>
          <p className="mt-1 text-sm text-gray-600">
            複数の消耗品を選択して、まとめて移動できます。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <ConsumableBulkMovementForm
            consumables={consumables || []}
            sites={sites || []}
          />
        </div>
      </div>
    </div>
  )
}
