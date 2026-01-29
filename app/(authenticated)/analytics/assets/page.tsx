import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'
import { analyzeInventoryOptimization } from '@/lib/analytics/inventory-optimization'
import AssetsDashboard from './AssetsDashboard'

export default async function AssetsAnalyticsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 権限チェック（リーダー以上のみ）
  if (userRole === 'staff') {
    redirect('/')
  }

  // パッケージチェック（現場資産パック必須）
  if (organizationId) {
    const features = await getOrganizationFeatures(organizationId)
    if (!hasPackage(features, 'asset')) {
      return <PackageRequired packageType="asset" featureName="資産管理分析" userRole={userRole} />
    }
  }

  // コスト分析用データ取得
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

  const { data: toolItems } = await supabase
    .from('tool_items')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

  const { data: movements } = await supabase
    .from('tool_movements')
    .select(`
      *,
      to_site:to_site_id(id, name),
      from_site:from_site_id(id, name)
    `)
    .eq('organization_id', organizationId)
    .gte('created_at', oneYearAgo.toISOString())

  const { data: consumableMovements } = await supabase
    .from('consumable_movements')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', oneYearAgo.toISOString())

  const { data: orders } = await supabase
    .from('consumable_orders')
    .select('*')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const { data: consumableInventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('organization_id', organizationId)

  // 使用状況分析用: 現場・ユーザー一覧取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 在庫最適化分析用: 消耗品データ取得
  const { data: consumables, error: consumablesError } = await supabase
    .from('tools')
    .select(`*, categories:category_id(name)`)
    .eq('organization_id', organizationId)
    .eq('management_type', 'consumable')
    .is('deleted_at', null)

  console.log('[Assets Page] Consumables query result:', {
    count: consumables?.length || 0,
    error: consumablesError,
    sample: consumables?.[0]
  })

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: consumableMovementsForOptimization, error: movementsError } = await supabase
    .from('consumable_movements')
    .select('*')
    .eq('organization_id', organizationId)
    .gte('created_at', sixMonthsAgo.toISOString())

  console.log('[Assets Page] Consumable movements query result:', {
    count: consumableMovementsForOptimization?.length || 0,
    error: movementsError,
    period: `${sixMonthsAgo.toISOString()} to now`
  })

  const consumablesWithCategory = (consumables || []).map((c: any) => ({
    ...c,
    category_name: c.categories?.name || null,
  }))

  console.log('[Assets Page] Calling analyzeInventoryOptimization with:', {
    consumablesCount: consumablesWithCategory.length,
    inventoryCount: (consumableInventory || []).length,
    movementsCount: (consumableMovementsForOptimization || []).length
  })

  // 在庫最適化レポート生成
  const inventoryReport = await analyzeInventoryOptimization(
    consumablesWithCategory,
    consumableInventory || [],
    consumableMovementsForOptimization || [],
    sixMonthsAgo,
    new Date()
  )

  console.log('[Assets Page] Inventory report generated:', {
    total_consumables: inventoryReport.total_consumables,
    optimizations_count: inventoryReport.optimizations.length
  })

  // ツールにカテゴリ名を追加
  const toolsWithCategory = (tools || []).map((tool: any) => ({
    ...tool,
    category_name: tool.categories?.name || null,
  }))

  return (
    <AssetsDashboard
      tools={toolsWithCategory}
      toolItems={toolItems || []}
      movements={movements || []}
      consumableMovements={consumableMovements || []}
      orders={orders || []}
      consumableInventory={consumableInventory || []}
      sites={sites || []}
      users={users || []}
      inventoryReport={inventoryReport}
    />
  )
}
