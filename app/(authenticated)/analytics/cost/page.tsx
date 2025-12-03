import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CostAnalyticsView from './CostAnalyticsView'

export default async function CostAnalyticsPage() {
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
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 権限チェック（リーダー以上のみ）
  if (userData.role === 'staff') {
    redirect('/')
  }

  // 道具マスタ取得（カテゴリ込み）
  const { data: tools } = await supabase
    .from('tools')
    .select(`
      *,
      categories:category_id (
        id,
        name
      )
    `)
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 個別アイテム取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)

  // 移動履歴取得（過去1年）
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: movements } = await supabase
    .from('tool_movements')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .gte('created_at', oneYearAgo.toISOString())

  // 消耗品移動履歴
  const { data: consumableMovements } = await supabase
    .from('consumable_movements')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .gte('created_at', oneYearAgo.toISOString())

  // 発注履歴取得
  const { data: orders } = await supabase
    .from('consumable_orders')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)

  // 点検記録取得（コスト情報付き）
  const { data: maintenanceRecords } = await supabase
    .from('tool_item_maintenance_records')
    .select('*')
    .eq('organization_id', userData.organization_id)

  // 消耗品在庫取得
  const { data: consumableInventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('organization_id', userData.organization_id)

  // ツールにカテゴリ名を追加
  const toolsWithCategory = (tools || []).map((tool: any) => ({
    ...tool,
    category_name: tool.categories?.name || null,
  }))

  return (
    <CostAnalyticsView
      tools={toolsWithCategory}
      toolItems={toolItems || []}
      movements={movements || []}
      consumableMovements={consumableMovements || []}
      orders={orders || []}
      maintenanceRecords={maintenanceRecords || []}
      consumableInventory={consumableInventory || []}
    />
  )
}
