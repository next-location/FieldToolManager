// コスト分析ライブラリ

export interface ToolCostAnalysis {
  tool_id: string
  tool_name: string
  category_name: string | null
  is_consumable: boolean

  // 購入コスト
  purchase_price: number | null
  purchase_date: string | null

  // 消耗品の場合の発注コスト
  total_order_cost: number // 発注合計金額
  total_ordered_quantity: number // 発注合計数量
  average_unit_price: number | null // 平均単価

  // 維持コスト（道具の場合）
  total_maintenance_cost: number // 点検・修理費用

  // 総コスト
  total_cost: number

  // 使用状況
  total_items: number // 個別アイテム数（道具の場合）
  current_inventory: number // 現在在庫数（消耗品の場合）
  movement_count: number // 移動回数（全ての移動）

  // 道具の指標
  site_checkout_count: number // 現場持ち出し回数
  site_checkout_unit_cost: number | null // 現場持ち出し単価
  last_used_date: string | null // 最終使用日（最後に現場に持ち出した日）

  // 消耗品の指標
  inventory_value: number // 在庫金額
  monthly_avg_consumption: number // 月平均消費量
  inventory_days: number | null // 在庫日数
}

export interface CostAnalyticsReport {
  period_start: string
  period_end: string

  // 全体統計
  total_tools: number
  total_consumables: number
  total_cost: number
  tool_cost: number
  consumable_cost: number

  // カテゴリ別コスト
  cost_by_category: {
    category_id: string | null
    category_name: string
    total_cost: number
    tool_count: number
  }[]

  // 個別分析
  tool_analyses: ToolCostAnalysis[]
}

/**
 * コスト分析を実行
 */
export function analyzeCosts(
  tools: any[],
  toolItems: any[],
  movements: any[],
  orders: any[],
  consumableInventory: any[],
  periodStart: Date,
  periodEnd: Date
): CostAnalyticsReport {
  const analyses: ToolCostAnalysis[] = []

  // 期間内のデータのみにフィルタリング
  const periodStartTime = periodStart.getTime()
  const periodEndTime = periodEnd.getTime()

  const filteredOrders = orders.filter((o: any) => {
    if (!o.order_date) return true // 日付がない場合は含める
    const orderTime = new Date(o.order_date).getTime()
    return orderTime >= periodStartTime && orderTime <= periodEndTime
  })

  const filteredMovements = movements.filter((m: any) => {
    if (!m.created_at) return true
    const moveTime = new Date(m.created_at).getTime()
    return moveTime >= periodStartTime && moveTime <= periodEndTime
  })

  // デバッグ：入力データ確認
  console.log(`[Cost Analysis Debug] Period: ${periodStart.toISOString().split('T')[0]} - ${periodEnd.toISOString().split('T')[0]}`)
  console.log(`[Cost Analysis Debug] tools count: ${tools.length}`)
  console.log(`[Cost Analysis Debug] ALL tools with management_type:`, tools.map((t: any) => ({
    id: t.id,
    name: t.name,
    management_type: t.management_type
  })))
  console.log(`[Cost Analysis Debug] orders count: ${orders.length} -> filtered: ${filteredOrders.length}`)
  console.log(`[Cost Analysis Debug] movements count: ${movements.length} -> filtered: ${filteredMovements.length}`)
  console.log(`[Cost Analysis Debug] toolItems count: ${toolItems.length}`)

  const consumableTools = tools.filter((t: any) => t.management_type === 'consumable')
  console.log(`[Cost Analysis Debug] consumable tools count: ${consumableTools.length}`)
  if (consumableTools.length > 0) {
    console.log(`[Cost Analysis Debug] consumable tools:`, consumableTools.map((t: any) => ({ id: t.id, name: t.name, management_type: t.management_type })))
  }
  if (filteredOrders.length > 0) {
    console.log(`[Cost Analysis Debug] orders sample:`, filteredOrders.slice(0, 3).map((o: any) => ({ id: o.id, tool_id: o.tool_id, total_price: o.total_price, order_date: o.order_date })))
  }

  for (const tool of tools) {
    // management_type が 'consumable' の場合が消耗品
    const isConsumable = tool.management_type === 'consumable'

    // 購入価格計算
    let purchasePrice = 0

    if (isConsumable) {
      // 消耗品の場合：発注コストの合計（期間フィルタ済み）
      const toolOrders = filteredOrders.filter((o: any) => o.tool_id === tool.id)
      purchasePrice = toolOrders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0)

      // デバッグログ
      if (toolOrders.length > 0) {
        console.log(`[Cost Analysis] 消耗品: ${tool.name}`)
        console.log(`  - 発注件数: ${toolOrders.length}`)
        console.log(`  - 購入価格合計: ${purchasePrice}`)
        console.log(`  - 発注データ:`, toolOrders.map((o: any) => ({ id: o.id, total_price: o.total_price })))
      }
    } else {
      // 道具の場合：個別アイテムの購入価格の合計
      const toolItemsForTool = toolItems.filter((ti: any) => ti.tool_id === tool.id)
      purchasePrice = toolItemsForTool.reduce((sum: number, ti: any) => sum + (ti.purchase_price || 0), 0)
    }

    // 発注コスト計算（消耗品の場合）
    let totalOrderCost = 0
    let totalOrderedQuantity = 0
    let averageUnitPrice: number | null = null

    if (isConsumable) {
      const toolOrders = filteredOrders.filter((o: any) => o.tool_id === tool.id)
      totalOrderCost = toolOrders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0)
      totalOrderedQuantity = toolOrders.reduce((sum: number, o: any) => sum + o.quantity, 0)
      averageUnitPrice = totalOrderedQuantity > 0 ? totalOrderCost / totalOrderedQuantity : null
    }

    // 総コスト計算
    const totalCost = purchasePrice

    // 使用状況
    const toolItemsForTool = toolItems.filter((ti: any) => ti.tool_id === tool.id)
    const totalItems = toolItemsForTool.length

    // 在庫数：消耗品は数量、道具は保有台数
    const currentInventory = isConsumable
      ? consumableInventory
          .filter((inv: any) => inv.tool_id === tool.id)
          .reduce((sum: number, inv: any) => sum + inv.quantity, 0)
      : toolItemsForTool.length

    const movementCount = filteredMovements.filter((m: any) => m.tool_id === tool.id).length

    // 道具の指標計算
    let siteCheckoutCount = 0
    let siteCheckoutUnitCost: number | null = null
    let lastUsedDate: string | null = null

    if (!isConsumable) {
      // 現場持ち出し回数（movement_type='check_out' かつ to_site_id が存在）
      const toolMovements = filteredMovements.filter((m: any) => m.tool_id === tool.id)
      console.log(`[Cost Analysis] Tool ${tool.name} movements:`, toolMovements.length)
      if (toolMovements.length > 0) {
        console.log('[Cost Analysis] Sample movement:', {
          movement_type: toolMovements[0].movement_type,
          to_site_id: toolMovements[0].to_site_id,
          to_site: toolMovements[0].to_site,
        })
      }

      const siteCheckouts = toolMovements.filter((m: any) =>
        m.movement_type === 'check_out' &&
        m.to_site_id != null
      )
      console.log(`[Cost Analysis] Tool ${tool.name} site checkouts:`, siteCheckouts.length)

      siteCheckoutCount = siteCheckouts.length
      siteCheckoutUnitCost = siteCheckoutCount > 0 ? totalCost / siteCheckoutCount : null

      // 最終使用日（最後に現場に持ち出した日）
      if (siteCheckouts.length > 0) {
        const sorted = siteCheckouts.sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        lastUsedDate = sorted[0].created_at
      }
    }

    // 在庫金額と消費指標の計算
    let inventoryValue = 0
    let monthlyAvgConsumption = 0
    let inventoryDays: number | null = null

    if (isConsumable) {
      // 消耗品：在庫金額（加重平均単価 × 在庫数）
      const weightedAvgPrice = averageUnitPrice || 0
      inventoryValue = currentInventory * weightedAvgPrice

      // 月平均消費量
      const periodMonths = (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
      monthlyAvgConsumption = periodMonths > 0 ? totalOrderedQuantity / periodMonths : 0

      // 在庫日数
      const dailyConsumption = monthlyAvgConsumption / 30
      inventoryDays = dailyConsumption > 0 ? currentInventory / dailyConsumption : null
    } else {
      // 道具：在庫金額（保有している全tool_itemsの購入金額合計）
      inventoryValue = toolItemsForTool.reduce((sum: number, ti: any) => sum + (ti.purchase_price || 0), 0)
    }

    analyses.push({
      tool_id: tool.id,
      tool_name: tool.name,
      category_name: isConsumable ? '消耗品' : (tool.category_name || null),
      is_consumable: isConsumable,
      purchase_price: purchasePrice,
      purchase_date: tool.purchase_date,
      total_order_cost: totalOrderCost,
      total_ordered_quantity: totalOrderedQuantity,
      average_unit_price: averageUnitPrice,
      total_maintenance_cost: 0,
      total_cost: totalCost,
      total_items: totalItems,
      current_inventory: currentInventory,
      movement_count: movementCount,
      site_checkout_count: siteCheckoutCount,
      site_checkout_unit_cost: siteCheckoutUnitCost,
      last_used_date: lastUsedDate,
      inventory_value: inventoryValue,
      monthly_avg_consumption: monthlyAvgConsumption,
      inventory_days: inventoryDays,
    })
  }

  // カテゴリ別コスト集計
  const categoryMap = new Map<string, { name: string; cost: number; count: number }>()

  for (const analysis of analyses) {
    const key = analysis.category_name || '未分類'
    const existing = categoryMap.get(key) || { name: key, cost: 0, count: 0 }
    existing.cost += analysis.total_cost
    existing.count += 1
    categoryMap.set(key, existing)
  }

  const costByCategory = Array.from(categoryMap.values()).map((v) => ({
    category_id: null,
    category_name: v.name,
    total_cost: v.cost,
    tool_count: v.count,
  }))

  // 全体統計
  const totalTools = analyses.filter((a) => !a.is_consumable).length
  const totalConsumables = analyses.filter((a) => a.is_consumable).length
  const totalCost = analyses.reduce((sum, a) => sum + a.total_cost, 0)
  const toolCost = analyses
    .filter((a) => !a.is_consumable)
    .reduce((sum, a) => sum + a.total_cost, 0)
  const consumableCost = analyses
    .filter((a) => a.is_consumable)
    .reduce((sum, a) => sum + a.total_cost, 0)

  return {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_tools: totalTools,
    total_consumables: totalConsumables,
    total_cost: totalCost,
    tool_cost: toolCost,
    consumable_cost: consumableCost,
    cost_by_category: costByCategory,
    tool_analyses: analyses,
  }
}

