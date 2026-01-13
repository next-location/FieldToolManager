import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { EditLocationForm } from './EditLocationForm'
import { updateWarehouseLocation } from '../../actions'

export default async function EditWarehouseLocationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

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

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <EditLocationForm location={location} action={updateWarehouseLocation} />
      </div>
    </div>
  )
}
