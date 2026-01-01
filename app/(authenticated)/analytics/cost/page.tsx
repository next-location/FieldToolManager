import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import CostAnalyticsView from './CostAnalyticsView'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'

export default async function CostAnalyticsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()


  // 権限チェック（リーダー以上のみ）
  if (userRole === 'staff') {
    redirect('/')
  }

  // パッケージチェック（現場資産パック必須）
  if (organizationId) {
    const features = await getOrganizationFeatures(organizationId)
    if (!hasPackage(features, 'asset')) {
      return <PackageRequired packageType="asset" featureName="コスト分析" userRole={userRole} />
    }
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
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // 個別アイテム取得
  const { data: toolItems } = await supabase
    .from('tool_items')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 移動履歴取得（過去1年）
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: movements } = await supabase
    .from('tool_movements')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', oneYearAgo.toISOString())

  // 消耗品移動履歴
  const { data: consumableMovements } = await supabase
    .from('consumable_movements')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', oneYearAgo.toISOString())

  // 発注履歴取得
  const { data: orders } = await supabase
    .from('consumable_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 点検記録取得（コスト情報付き）
  const { data: maintenanceRecords } = await supabase
    .from('tool_item_maintenance_records')
    .select('*')
    .eq('organization_id', organizationId)

  // 消耗品在庫取得
  const { data: consumableInventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('organization_id', organizationId)

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
