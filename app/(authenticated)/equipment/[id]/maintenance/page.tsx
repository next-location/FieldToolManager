import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import MaintenanceRecordForm from './MaintenanceRecordForm'

export default async function EquipmentMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー名取得
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  // 重機詳細を取得
  const { data: equipment, error } = await supabase
    .from('heavy_equipment')
    .select(`
      *,
      heavy_equipment_categories (
        name
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !equipment) {
    redirect('/equipment')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <a
            href={`/equipment/${id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            重機詳細に戻る
          </a>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">修理・点検記録の登録</h1>
          <p className="mt-1 text-sm text-gray-500">
            {equipment.name} ({equipment.equipment_code}) - {equipment.heavy_equipment_categories?.name}
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">

            <MaintenanceRecordForm
              equipmentId={id}
              equipmentName={equipment.name}
              currentUserName={userData?.name || ''}
              organizationId={organizationId}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
