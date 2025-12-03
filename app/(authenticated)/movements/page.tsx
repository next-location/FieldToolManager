import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MovementTabs } from './MovementTabs'

export default async function MovementsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

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
    .eq('organization_id', userData.organization_id)
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
    .eq('organization_id', userData.organization_id)
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <MovementTabs
      toolMovements={toolMovements || []}
      consumableMovements={consumableMovements || []}
    />
  )
}
