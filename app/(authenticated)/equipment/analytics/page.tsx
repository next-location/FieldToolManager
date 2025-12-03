import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AnalyticsReportView from './AnalyticsReportView'
import type {
  HeavyEquipment,
  HeavyEquipmentUsageRecord,
  HeavyEquipmentMaintenance,
} from '@/types/heavy-equipment'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報と組織設定を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('email', user.email)
    .single()

  // 組織の重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled')
    .eq('id', userData?.organization_id)
    .single()

  // 重機管理機能が無効の場合はダッシュボードへリダイレクト
  if (!orgData?.heavy_equipment_enabled) {
    redirect('/')
  }

  // 重機一覧を取得
  const { data: equipment } = await supabase
    .from('heavy_equipment')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('equipment_code', { ascending: true })

  // 全重機の使用記録を取得
  const { data: usageRecords } = await supabase
    .from('heavy_equipment_usage_records')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .order('action_at', { ascending: false })

  // 全重機の点検記録を取得
  const { data: maintenanceRecords } = await supabase
    .from('heavy_equipment_maintenance')
    .select('*')
    .eq('organization_id', userData?.organization_id)
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

  const periodStart = threeMonthsAgo.toISOString().split('T')[0]
  const periodEnd = today.toISOString().split('T')[0]

  return (
    <AnalyticsReportView
      equipment={equipment as HeavyEquipment[] || []}
      usageMap={usageMap}
      maintenanceMap={maintenanceMap}
      defaultPeriodStart={periodStart}
      defaultPeriodEnd={periodEnd}
      userRole={userData?.role || 'staff'}
    />
  )
}
