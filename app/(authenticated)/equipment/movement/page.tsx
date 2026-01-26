import { redirect } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import EquipmentMovementForm from './EquipmentMovementForm'

interface EquipmentMovementPageProps {
  searchParams: Promise<{ items?: string }>
}

export default async function EquipmentMovementPage({ searchParams }: EquipmentMovementPageProps) {
  const params = await searchParams
  const scannedItemIds = params.items ? params.items.split(',') : []

  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // パッケージチェック（現場資産パック または フル機能統合パックが必要）
  const packages = await getOrganizationPackages(organizationId, supabase)
  if (!packages.hasAssetPackage && packages.packageType !== 'full') {
    redirect('/')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  // 組織の重機管理機能設定を取得
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, heavy_equipment_settings')
    .eq('id', organizationId)
    .single()

  // 運用設定で重機機能が無効化されている場合はリダイレクト
  if (orgData?.heavy_equipment_enabled === false) {
    redirect('/equipment')
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
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // 拠点一覧を取得（自社拠点 + 顧客現場）
  const { data: locations } = await supabase
    .from('sites')
    .select('id, name, type, is_own_location')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('is_own_location', { ascending: false }) // 自社拠点を先に表示
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pt-3 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">重機移動</h1>
          <p className="mt-1 text-sm text-gray-600">
            重機の持出・返却・現場間移動を記録します
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <EquipmentMovementForm
            equipment={(equipment as any) || []}
            locations={locations || []}
            currentUserId={userId}
            currentUserName={userData?.name || ''}
            organizationSettings={orgData?.heavy_equipment_settings}
            scannedItemIds={scannedItemIds}
          />
        </div>
      </div>
    </div>
  )
}
