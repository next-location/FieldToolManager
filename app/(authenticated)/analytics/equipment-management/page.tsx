import { redirect } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import EquipmentManagementDashboard from './EquipmentManagementDashboard'
import type {
  HeavyEquipment,
  HeavyEquipmentUsageRecord,
  HeavyEquipmentMaintenance,
} from '@/types/heavy-equipment'

export default async function EquipmentManagementAnalyticsPage() {
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

  // 重機一覧を取得
  const { data: equipment } = await supabase
    .from('heavy_equipment')
    .select(`
      *,
      heavy_equipment_categories (
        code_prefix
      )
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('equipment_code', { ascending: true })

  // 全重機の使用記録を取得
  const { data: usageRecords } = await supabase
    .from('heavy_equipment_usage_records')
    .select('*')
    .eq('organization_id', organizationId)
    .order('action_at', { ascending: false })

  // 全重機の点検記録を取得
  const { data: maintenanceRecords } = await supabase
    .from('heavy_equipment_maintenance')
    .select('*')
    .eq('organization_id', organizationId)
    .order('maintenance_date', { ascending: false })

  // 使用記録を重機IDでマッピング
  const usageMap: Record<string, HeavyEquipmentUsageRecord[]> = {}
  if (usageRecords) {
    for (const record of usageRecords) {
      if (!usageMap[record.equipment_id]) {
        usageMap[record.equipment_id] = []
      }
      usageMap[record.equipment_id].push(record)
    }
  }

  // 点検記録を重機IDでマッピング
  const maintenanceMap: Record<string, HeavyEquipmentMaintenance[]> = {}
  if (maintenanceRecords) {
    for (const record of maintenanceRecords) {
      if (!maintenanceMap[record.equipment_id]) {
        maintenanceMap[record.equipment_id] = []
      }
      maintenanceMap[record.equipment_id].push(record)
    }
  }

  // デフォルト期間: 過去3ヶ月
  const today = new Date()
  const threeMonthsAgo = new Date(today)
  threeMonthsAgo.setMonth(today.getMonth() - 3)
  const defaultPeriodStart = threeMonthsAgo.toISOString().split('T')[0]
  const defaultPeriodEnd = today.toISOString().split('T')[0]

  return (
    <EquipmentManagementDashboard
      equipment={equipment as HeavyEquipment[] || []}
      usageMap={usageMap}
      maintenanceMap={maintenanceMap}
      defaultPeriodStart={defaultPeriodStart}
      defaultPeriodEnd={defaultPeriodEnd}
      userRole={userRole || 'staff'}
    />
  )
}
