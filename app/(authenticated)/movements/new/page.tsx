import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { MovementForm } from './MovementForm'

export default async function NewMovementPage({
  searchParams,
}: {
  searchParams: Promise<{ tool_id?: string; tool_item_id?: string; tool_set_id?: string }>
}) {
  const params = await searchParams
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 組織のユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  // 道具セットが指定されている場合、セットに含まれるアイテムを取得
  let toolSetItems: any[] = []
  let toolSetName = ''
  if (params.tool_set_id) {
    const { data: toolSet } = await supabase
      .from('tool_sets')
      .select('name')
      .eq('id', params.tool_set_id)
      .single()

    toolSetName = toolSet?.name || ''

    const { data: setItems } = await supabase
      .from('tool_set_items')
      .select(
        `
        tool_item:tool_items (
          id,
          serial_number,
          current_location,
          current_site_id,
          status,
          tools (
            id,
            name,
            model_number
          )
        )
      `
      )
      .eq('tool_set_id', params.tool_set_id)

    toolSetItems = (setItems || []).map((item: any) => item.tool_item).filter(Boolean)
  }

  // 個別アイテム一覧を取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select(
      `
      id,
      serial_number,
      current_location,
      current_site_id,
      status,
      tools (
        id,
        name,
        model_number
      )
    `
    )
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('serial_number')

  // 現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 倉庫位置一覧を取得
  const { data: warehouseLocations } = await supabase
    .from('warehouse_locations')
    .select('id, code, display_name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('code')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">移動を登録</h1>
              {toolSetName && (
                <p className="text-sm text-gray-600 mt-1">
                  道具セット: {toolSetName}
                </p>
              )}
            </div>
            {!params.tool_set_id && (
              <Link
                href="/movements"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                ← 一覧に戻る
              </Link>
            )}
          </div>

          <MovementForm
            toolItems={toolItems || []}
            sites={sites || []}
            warehouseLocations={warehouseLocations || []}
            selectedItemId={params.tool_item_id}
            toolSetItems={toolSetItems}
            toolSetId={params.tool_set_id}
          />
        </div>
      </div>
    </div>
  )
}
