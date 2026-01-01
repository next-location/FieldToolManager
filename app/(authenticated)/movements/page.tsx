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
      tool_items!inner (
        id,
        serial_number,
        tools!inner (name, model_number)
      ),
      from_site:sites!tool_movements_from_site_id_fkey (name),
      to_site:sites!tool_movements_to_site_id_fkey (name),
      users!inner (name)
    `
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

  // 消耗品移動履歴を取得
  const { data: consumableMovements } = await supabase
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
      tools (
        name,
        model_number
      ),
      from_site:from_site_id (
        name
      ),
      to_site:to_site_id (
        name
      ),
      users:performed_by (
        name
      )
    `
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(100)

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
        users!inner (name)
      `
      )
      .eq('organization_id', organizationId)
      .order('action_at', { ascending: false })
      .limit(100)

    equipmentMovements = data || []
  }

  return (
    <MovementTabs
      toolMovements={toolMovements || []}
      consumableMovements={consumableMovements || []}
      equipmentMovements={equipmentMovements}
      heavyEquipmentEnabled={orgData?.heavy_equipment_enabled || false}
    />
  )
}
