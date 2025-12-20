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
  movement_count: number // 移動回数

  // コスト効率
  cost_per_movement: number | null // 移動あたりのコスト
  cost_efficiency_score: number // 0-100のスコア
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
  maintenanceRecords: any[],
  consumableInventory: any[],
  periodStart: Date,
  periodEnd: Date
): CostAnalyticsReport {
  const analyses: ToolCostAnalysis[] = []

  for (const tool of tools) {
    const isConsumable = tool.is_consumable || false

    // 発注コスト計算（消耗品の場合）
    let totalOrderCost = 0
    let totalOrderedQuantity = 0
    let averageUnitPrice: number | null = null

    if (isConsumable) {
      const toolOrders = orders.filter((o: any) => o.tool_id === tool.id)
      totalOrderCost = toolOrders.reduce((sum: number, o: any) => sum + (o.total_price || 0), 0)
      totalOrderedQuantity = toolOrders.reduce((sum: number, o: any) => sum + o.quantity, 0)
      averageUnitPrice = totalOrderedQuantity > 0 ? totalOrderCost / totalOrderedQuantity : null
    }

    // 点検・修理コスト計算（道具の場合）
    let totalMaintenanceCost = 0
    if (!isConsumable) {
      const toolMaintenances = maintenanceRecords.filter((m: any) => {
        const toolItemIds = toolItems
          .filter((ti: any) => ti.tool_id === tool.id)
          .map((ti: any) => ti.id)
        return toolItemIds.includes(m.tool_item_id)
      })
      totalMaintenanceCost = toolMaintenances.reduce(
        (sum: number, m: any) => sum + (m.cost || 0),
        0
      )
    }

    // 総コスト計算
    const purchasePrice = tool.purchase_price || 0
    const totalCost = purchasePrice + totalOrderCost + totalMaintenanceCost

    // 使用状況
    const toolItemsForTool = toolItems.filter((ti: any) => ti.tool_id === tool.id)
    const totalItems = toolItemsForTool.length

    const currentInventory = isConsumable
      ? consumableInventory
          .filter((inv: any) => inv.tool_id === tool.id)
          .reduce((sum: number, inv: any) => sum + inv.quantity, 0)
      : 0

    const movementCount = movements.filter((m: any) => m.tool_id === tool.id).length

    // コスト効率スコア計算
    const costPerMovement = movementCount > 0 ? totalCost / movementCount : null
    const costEfficiencyScore = calculateCostEfficiency(
      totalCost,
      movementCount,
      isConsumable,
      currentInventory
    )

    analyses.push({
      tool_id: tool.id,
      tool_name: tool.name,
      category_name: tool.category_name || null,
      is_consumable: isConsumable,
      purchase_price: tool.purchase_price,
      purchase_date: tool.purchase_date,
      total_order_cost: totalOrderCost,
      total_ordered_quantity: totalOrderedQuantity,
      average_unit_price: averageUnitPrice,
      total_maintenance_cost: totalMaintenanceCost,
      total_cost: totalCost,
      total_items: totalItems,
      current_inventory: currentInventory,
      movement_count: movementCount,
      cost_per_movement: costPerMovement,
      cost_efficiency_score: costEfficiencyScore,
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

/**
 * コスト効率スコア計算（0-100）
 */
function calculateCostEfficiency(
  totalCost: number,
  movementCount: number,
  isConsumable: boolean,
  currentInventory: number
): number {
  if (totalCost === 0) return 100

  // 移動回数が多いほど効率が良い
  let score = Math.min((movementCount / 100) * 100, 100)

  // 消耗品の場合、在庫が適正範囲にあるかチェック
  if (isConsumable) {
    if (currentInventory === 0) {
      score *= 0.5 // 在庫切れペナルティ
    } else if (currentInventory > 1000) {
      score *= 0.8 // 過剰在庫ペナルティ
    }
  }

  // コストが高すぎる場合のペナルティ
  if (totalCost > 1000000) {
    score *= 0.7
  }

  return Math.max(0, Math.min(100, score))
}
