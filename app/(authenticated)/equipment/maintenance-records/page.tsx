import { redirect } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import MaintenanceRecordsListView from './MaintenanceRecordsListView'

export default async function MaintenanceRecordsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // パッケージチェック（現場資産パック または フル機能統合パックが必要）
  const packages = await getOrganizationPackages(organizationId, supabase)
  if (!packages.hasAssetPackage && packages.packageType !== 'full') {
    redirect('/')
  }

  // 組織の重機管理機能設定を取得
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled')
    .eq('id', organizationId)
    .single()

  // 運用設定で重機機能が無効化されている場合はリダイレクト
  if (orgData?.heavy_equipment_enabled === false) {
    redirect('/equipment')
  }

  // 重機一覧を取得（フィルタ用）
  const { data: equipment } = await supabase
    .from('heavy_equipment')
    .select('id, equipment_code, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('equipment_code', { ascending: true })

  // 全点検記録を取得
  const { data: maintenanceRecords } = await supabase
    .from('heavy_equipment_maintenance')
    .select(`
      *,
      heavy_equipment (
        id,
        equipment_code,
        name,
        ownership_type
      )
    `)
    .eq('organization_id', organizationId)
    .order('maintenance_date', { ascending: false })

  return (
    <MaintenanceRecordsListView
      equipment={equipment || []}
      maintenanceRecords={maintenanceRecords || []}
      userRole={userRole || 'staff'}
    />
  )
}
