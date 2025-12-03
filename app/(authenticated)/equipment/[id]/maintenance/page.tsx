import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import MaintenanceRecordForm from './MaintenanceRecordForm'

export default async function EquipmentMaintenancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

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
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
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

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">
              点検記録の登録
            </h2>
            <p className="text-sm text-gray-500 mb-1">
              {equipment.name} ({equipment.equipment_code})
            </p>
            <p className="text-xs text-gray-400 mb-6">
              {equipment.heavy_equipment_categories?.name}
            </p>

            <MaintenanceRecordForm
              equipmentId={id}
              equipmentName={equipment.name}
              currentUserName={userData.name}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
