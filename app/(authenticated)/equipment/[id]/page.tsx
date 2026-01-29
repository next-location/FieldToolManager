import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import EquipmentDetailTabs from './EquipmentDetailTabs'

export default async function EquipmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  // 重機詳細を取得
  const { data: equipment, error } = await supabase
    .from('heavy_equipment')
    .select(`
      *,
      heavy_equipment_categories (
        name,
        icon
      ),
      current_location:sites!heavy_equipment_current_location_id_fkey (
        name
      ),
      default_location:sites!heavy_equipment_default_location_id_fkey (
        name
      ),
      users!heavy_equipment_current_user_id_fkey (
        name,
        email
      )
    `)
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !equipment) {
    redirect('/equipment')
  }

  // 使用履歴を取得
  const { data: usageRecords } = await supabase
    .from('heavy_equipment_usage_records')
    .select(`
      *,
      users (name),
      from_site:sites!heavy_equipment_usage_records_from_location_id_fkey (name),
      to_site:sites!heavy_equipment_usage_records_to_location_id_fkey (name)
    `)
    .eq('equipment_id', id)
    .order('action_at', { ascending: false })
    .limit(20)

  // 点検記録を取得
  const { data: maintenanceRecords } = await supabase
    .from('heavy_equipment_maintenance')
    .select('*')
    .eq('equipment_id', id)
    .order('maintenance_date', { ascending: false })
    .limit(10)

  // 組織設定を取得
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_settings, qr_print_size')
    .eq('id', organizationId)
    .single()

  const qrSize = orgData?.qr_print_size || 25

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole || '')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/equipment"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 flex items-center"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            重機一覧に戻る
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">重機詳細</h1>
        </div>

        <EquipmentDetailTabs
          equipment={equipment}
          usageRecords={usageRecords || []}
          maintenanceRecords={maintenanceRecords || []}
          organizationSettings={orgData?.heavy_equipment_settings || {}}
          isLeaderOrAdmin={isManagerOrAdmin}
          qrSize={qrSize}
        />
      </div>
    </div>
  )
}
