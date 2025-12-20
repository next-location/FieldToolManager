import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EquipmentMovementForm from './EquipmentMovementForm'

export default async function EquipmentMovementPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報と組織設定を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('email', user.email)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', userData?.organization_id)
    .single()

  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // 利用可能な重機一覧を取得
  const { data: equipment } = await supabase
    .from('heavy_equipment')
    .select(`
      id,
      equipment_code,
      name,
      status,
      current_location_id,
      enable_hour_meter,
      current_hour_meter,
      heavy_equipment_categories (
        name
      ),
      sites!heavy_equipment_current_location_id_fkey (
        id,
        name
      )
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, site_type')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">重機移動</h1>
          <p className="mt-1 text-sm text-gray-600">
            重機の持出・返却・現場間移動を記録します
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <EquipmentMovementForm
            equipment={equipment || []}
            sites={sites || []}
            currentUserId={user.id}
            currentUserName={userData.name}
            organizationSettings={orgData.heavy_equipment_settings}
          />
        </div>
      </div>
    </div>
  )
}
