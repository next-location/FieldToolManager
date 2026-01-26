import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { BulkMovementForm } from './BulkMovementForm'

// 道具の最新状態を常に取得するためキャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BulkMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; toolSetId?: string }>
}) {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // スキャンされたアイテムIDとセットIDを取得
  const params = await searchParams
  const scannedItemIds = params.items ? params.items.split(',') : []
  const selectedToolSetId = params.toolSetId || null

  // 道具個別アイテムを取得（削除されていないもの）
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(`
      id,
      serial_number,
      qr_code,
      current_location,
      current_site_id,
      warehouse_location_id,
      status,
      tool_id,
      current_site:sites!tool_items_current_site_id_fkey (id, name),
      warehouse_location:warehouse_locations!tool_items_warehouse_location_id_fkey (id, code, display_name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('serial_number')

  // 道具マスタを取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, model_number')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, is_active')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 倉庫位置一覧を取得
  const { data: warehouseLocations } = await supabase
    .from('warehouse_locations')
    .select('id, code, display_name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('code')

  // 道具セット一覧を取得
  const { data: toolSetsRaw } = await supabase
    .from('tool_sets')
    .select(`
      id,
      name,
      description
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // 道具セットアイテムを取得
  const { data: toolSetItems } = await supabase
    .from('tool_set_items')
    .select('tool_set_id, tool_item_id, tool_sets!inner(id, name)')
    .in('tool_set_id', (toolSetsRaw || []).map(s => s.id))

  // セット登録済み道具のマップを作成（tool_item_id -> セット名）
  const toolItemToSetMap = new Map<string, string>()
  ;(toolSetItems || []).forEach(item => {
    if (item.tool_sets) {
      toolItemToSetMap.set(item.tool_item_id, (item.tool_sets as any).name)
    }
  })

  // toolItems と tools を結合し、セット登録情報を追加
  const toolsMap = new Map((tools || []).map(t => [t.id, t]))
  const formattedToolItems = (toolItems || []).map((item: any) => ({
    ...item,
    tools: toolsMap.get(item.tool_id) || null,
    inToolSet: toolItemToSetMap.has(item.id),
    toolSetName: toolItemToSetMap.get(item.id) || null,
    current_site: item.current_site ? [item.current_site] : null
  }))

  // 道具セットとアイテムを結合
  const toolSets = (toolSetsRaw || []).map((set: any) => {
    const items = (toolSetItems || []).filter(item => item.tool_set_id === set.id)
    const itemsWithDetails = items.map(item => {
      const toolItem = formattedToolItems.find(ti => ti.id === item.tool_item_id)
      return { tool_item: toolItem || null }
    })
    return {
      id: set.id,
      name: set.name,
      description: set.description,
      tool_set_items: itemsWithDetails
    }
  })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pt-3 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">道具移動</h1>
          <p className="mt-1 text-sm text-gray-600">
            移動先を選択してから、道具を連続でスキャンまたは選択して一括移動できます。
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <BulkMovementForm
            toolItems={formattedToolItems}
            sites={sites || []}
            warehouseLocations={warehouseLocations || []}
            toolSets={toolSets || []}
            scannedItemIds={scannedItemIds}
            selectedToolSetId={selectedToolSetId}
            organizationId={organizationId}
            userId={userId}
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  )
}
