import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import LocationsWarehouseUnified from './LocationsWarehouseUnified'

export default async function LocationsWarehousePage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin権限がない場合はリダイレクト
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 自社拠点を取得
  const { data: locations } = await supabase
    .from('sites')
    .select('*')
    .eq('organization_id', organizationId)
    .neq('type', 'customer_site')
    .is('deleted_at', null)
    .order('type')
    .order('name')

  // 倉庫位置を取得
  const { data: warehouseLocations } = await supabase
    .from('warehouse_locations')
    .select('*, sites(name, type)')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('site_id', { nullsFirst: true })
    .order('code')

  // 位置ごとの道具数を取得
  const locationsWithCounts = await Promise.all(
    (warehouseLocations || []).map(async (location) => {
      const { count } = await supabase
        .from('tool_items')
        .select('*', { count: 'exact', head: true })
        .eq('warehouse_location_id', location.id)
        .eq('current_location', 'warehouse')
        .is('deleted_at', null)

      return {
        ...location,
        tool_count: count || 0,
      }
    })
  )

  return (
    <LocationsWarehouseUnified
      locations={locations || []}
      warehouseLocations={locationsWithCounts}
      organizationId={organizationId}
    />
  )
}
