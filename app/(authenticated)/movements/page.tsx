import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { MovementTabs } from './MovementTabs'

export default async function MovementsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 道具移動履歴を取得
  const { data: toolMovements } = await supabase
    .from('tool_movements')
    .select(
      `
      *,
      tool_items (
        id,
        serial_number,
        tool_id
      ),
      from_site:sites!tool_movements_from_site_id_fkey (name),
      to_site:sites!tool_movements_to_site_id_fkey (name),
      users!tool_movements_performed_by_fkey (name)
    `
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  // 道具マスタを取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, model_number')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // toolItemsとtoolsを結合
  const toolsMap = new Map((tools || []).map(t => [t.id, t]))
  const formattedToolMovements = (toolMovements || []).map((movement: any) => ({
    ...movement,
    tool_items: movement.tool_items ? {
      ...movement.tool_items,
      tools: toolsMap.get(movement.tool_items.tool_id) || null
    } : null,
    // tool_itemsがない場合（在庫調整など）はtool_idから直接取得
    tools: movement.tool_items ? null : toolsMap.get(movement.tool_id) || null
  }))

  // 消耗品移動履歴を取得
  const { data: rawConsumableMovements } = await supabase
    .from('consumable_movements')
    .select(
      `
      id,
      movement_type,
      from_location_type,
      to_location_type,
      quantity,
      notes,
      created_at,
      tool_id,
      tools!consumable_movements_tool_id_fkey (
        name,
        model_number
      ),
      from_site:sites!consumable_movements_from_site_id_fkey (
        name
      ),
      to_site:sites!consumable_movements_to_site_id_fkey (
        name
      ),
      users!consumable_movements_performed_by_fkey (
        name
      )
    `
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Supabaseの配列形式を単一オブジェクトに変換
  const consumableMovements = (rawConsumableMovements || []).map((movement: any) => ({
    ...movement,
    tools: Array.isArray(movement.tools) ? movement.tools[0] : movement.tools,
    from_site: Array.isArray(movement.from_site) ? movement.from_site[0] : movement.from_site,
    to_site: Array.isArray(movement.to_site) ? movement.to_site[0] : movement.to_site,
    users: Array.isArray(movement.users) ? movement.users[0] : movement.users,
  }))

  // 重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled')
    .eq('id', organizationId)
    .single()

  // 重機移動履歴を取得（重機管理が有効な場合のみ）
  let equipmentMovements = []
  if (orgData?.heavy_equipment_enabled) {
    const { data } = await supabase
      .from('heavy_equipment_usage_records')
      .select(
        `
        *,
        heavy_equipment!inner (equipment_code, name),
        from_site:from_location_id (name),
        to_site:to_location_id (name),
        users!inner (name),
        other_location_name
      `
      )
      .eq('organization_id', organizationId)
      .order('action_at', { ascending: false })
      .limit(100)

    equipmentMovements = data || []
  }

  return (
    <MovementTabs
      toolMovements={formattedToolMovements}
      consumableMovements={consumableMovements || []}
      equipmentMovements={equipmentMovements}
      heavyEquipmentEnabled={orgData?.heavy_equipment_enabled || false}
    />
  )
}
