import { redirect } from 'next/navigation'
import { requireAuth, getOrganizationPackages } from '@/lib/auth/page-auth'
import AnalyticsReportView from './AnalyticsReportView'
import type {
  HeavyEquipment,
  HeavyEquipmentUsageRecord,
  HeavyEquipmentMaintenance,
} from '@/types/heavy-equipment'

// Force dynamic rendering - disable all caching
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AnalyticsPage() {
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
    .select('*')
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

  // デフォルト期間: 当月1日から今日まで（日本時間基準）
  const now = new Date()
  const japanDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
  const firstDayOfMonth = new Date(japanDate.getFullYear(), japanDate.getMonth(), 1)

  // YYYY-MM-DD形式に変換
  const periodStart = `${firstDayOfMonth.getFullYear()}-${String(firstDayOfMonth.getMonth() + 1).padStart(2, '0')}-01`
  const periodEnd = `${japanDate.getFullYear()}-${String(japanDate.getMonth() + 1).padStart(2, '0')}-${String(japanDate.getDate()).padStart(2, '0')}`

  console.log('[Analytics] Default period:', { periodStart, periodEnd, japanDate: japanDate.toISOString(), serverTime: now.toISOString() })

  return (
    <AnalyticsReportView
      equipment={equipment as HeavyEquipment[] || []}
      usageMap={usageMap}
      maintenanceMap={maintenanceMap}
      defaultPeriodStart={periodStart}
      defaultPeriodEnd={periodEnd}
      userRole={userRole || 'staff'}
    />
  )
}
