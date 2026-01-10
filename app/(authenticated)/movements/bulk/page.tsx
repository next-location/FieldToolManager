import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { BulkMovementForm } from './BulkMovementForm'

export default async function BulkMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>
}) {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // スキャンされたアイテムIDを取得
  const params = await searchParams
  const scannedItemIds = params.items ? params.items.split(',') : []

  // 道具個別アイテムを取得（削除されていないもの）
  const { data: toolItems, error: toolItemsError } = await supabase
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
      tools (
        id,
        name,
        model_number
      )
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('serial_number')

  // サーバーログでデータ構造を確認
  if (scannedItemIds.length > 0 && toolItems && toolItems.length > 0) {
    console.log('=== DEBUG: Data Structure ===')
    console.log('scannedItemIds:', scannedItemIds)
    const scannedTools = toolItems.filter(t => scannedItemIds.includes(t.id))
    console.log('Found scanned tools:', scannedTools.length)
    console.log('First scanned tool:', JSON.stringify(scannedTools[0], null, 2))
    console.log('tools field type:', typeof scannedTools[0]?.tools)
    console.log('tools is array?', Array.isArray(scannedTools[0]?.tools))
    console.log('============================')
  }
  if (toolItemsError) {
    console.error('toolItemsError:', toolItemsError)
  }

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
      description,
      status,
      tool_set_items (
        tool_item_id,
        tool_items (
          id,
          serial_number,
          current_location,
          current_site_id,
          status,
          qr_code,
          tools (
            id,
            name,
            model_number
          )
        )
      )
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // toolItems のデータを整形（tools配列を単一オブジェクトに変換）
  const formattedToolItems = (toolItems || []).map((item: any) => ({
    ...item,
    tools: Array.isArray(item.tools) && item.tools.length > 0 ? item.tools[0] : null
  }))

  // データを整形
  const toolSets = (toolSetsRaw || []).map((set: any) => ({
    id: set.id,
    name: set.name,
    description: set.description,
    status: set.status,
    tool_set_items: (set.tool_set_items || []).map((item: any) => ({
      tool_item: item.tool_items
    }))
  }))

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
          />
        </div>
      </div>
    </div>
  )
}
