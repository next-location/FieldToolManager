// 在庫最適化ライブラリ

export interface InventoryOptimization {
  tool_id: string
  tool_name: string
  category_name: string | null

  // 現在の在庫状況
  current_inventory: number
  warehouse_inventory: number
  site_inventory_total: number

  // 使用パターン
  average_usage_per_month: number
  max_usage_per_month: number
  min_usage_per_month: number

  // 推奨値
  recommended_min_stock: number // 推奨最小在庫
  recommended_max_stock: number // 推奨最大在庫
  recommended_reorder_point: number // 発注点

  // 在庫状態
  status: 'optimal' | 'low' | 'excess' | 'out_of_stock'
  days_until_stockout: number | null // 在庫切れまでの日数（予測）

  // アクション
  action_needed: string | null // 必要なアクション
}

export interface InventoryOptimizationReport {
  period_start: string
  period_end: string

  // 全体統計
  total_consumables: number
  optimal_stock_count: number
  low_stock_count: number
  excess_stock_count: number
  out_of_stock_count: number

  // 個別最適化
  optimizations: InventoryOptimization[]
}

/**
 * 在庫最適化分析を実行
 */
export async function analyzeInventoryOptimization(
  consumableTools: any[],
  inventory: any[],
  movements: any[],
  periodStart: Date,
  periodEnd: Date
): Promise<InventoryOptimizationReport> {
  const optimizations: InventoryOptimization[] = []

  const monthsDiff = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24 * 30)
  )

  for (const tool of consumableTools) {
    // 在庫情報取得
    const toolInventory = inventory.filter((inv: any) => inv.tool_id === tool.id)
    const warehouseInv = toolInventory
      .filter((inv: any) => inv.location_type === 'warehouse')
      .reduce((sum: number, inv: any) => sum + inv.quantity, 0)
    const siteInv = toolInventory
      .filter((inv: any) => inv.location_type === 'site')
      .reduce((sum: number, inv: any) => sum + inv.quantity, 0)
    const currentInventory = warehouseInv + siteInv

    // 使用パターン分析（出庫・移動履歴）
    const toolMovements = movements.filter((m: any) => m.tool_id === tool.id)

    // 実際の消費を表す移動のみを抽出
    // 1. 出庫（倉庫から出た）
    // 2. 倉庫から現場への移動
    const outboundMovements = toolMovements.filter(
      (m: any) =>
        m.movement_type === '出庫' ||
        (m.from_location_type === 'warehouse' && m.to_location_type === 'site')
    )

    // 月ごとの使用量を計算
    const monthlyUsage: number[] = []
    for (let i = 0; i < monthsDiff; i++) {
      const monthStart = new Date(periodStart)
      monthStart.setMonth(periodStart.getMonth() + i)
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthStart.getMonth() + 1)

      const monthUsage = outboundMovements
        .filter((m: any) => {
          const movementDate = new Date(m.created_at)
          return movementDate >= monthStart && movementDate < monthEnd
        })
        .reduce((sum: number, m: any) => sum + m.quantity, 0)

      monthlyUsage.push(monthUsage)
    }

    const averageUsagePerMonth =
      monthlyUsage.length > 0
        ? monthlyUsage.reduce((sum, val) => sum + val, 0) / monthlyUsage.length
        : 0
    const maxUsagePerMonth = monthlyUsage.length > 0 ? Math.max(...monthlyUsage) : 0
    const minUsagePerMonth = monthlyUsage.length > 0 ? Math.min(...monthlyUsage) : 0

    // 推奨在庫レベル計算
    // 安全在庫 = 最大使用量 × リードタイム（1ヶ月と仮定）
    const recommendedMinStock = Math.ceil(maxUsagePerMonth * 1.2) // 20%のバッファ
    const recommendedMaxStock = Math.ceil(maxUsagePerMonth * 3) // 3ヶ月分
    const recommendedReorderPoint = Math.ceil(averageUsagePerMonth * 1.5) // 1.5ヶ月分

    // 在庫状態の判定
    let status: 'optimal' | 'low' | 'excess' | 'out_of_stock'
    if (currentInventory === 0) {
      status = 'out_of_stock'
    } else if (currentInventory < recommendedMinStock) {
      status = 'low'
    } else if (currentInventory > recommendedMaxStock) {
      status = 'excess'
    } else {
      status = 'optimal'
    }

    // 在庫切れまでの日数予測
    const daysUntilStockout =
      averageUsagePerMonth > 0 && currentInventory > 0
        ? Math.floor((currentInventory / averageUsagePerMonth) * 30)
        : null

    // 必要なアクション
    let actionNeeded: string | null = null
    if (status === 'out_of_stock') {
      actionNeeded = '緊急発注が必要です'
    } else if (status === 'low') {
      actionNeeded = `発注を推奨（推奨発注量: ${recommendedMinStock - currentInventory}個）`
    } else if (status === 'excess') {
      actionNeeded = '過剰在庫 - 使用を促進してください'
    }

    optimizations.push({
      tool_id: tool.id,
      tool_name: tool.name,
      category_name: tool.category_name || null,
      current_inventory: currentInventory,
      warehouse_inventory: warehouseInv,
      site_inventory_total: siteInv,
      average_usage_per_month: averageUsagePerMonth,
      max_usage_per_month: maxUsagePerMonth,
      min_usage_per_month: minUsagePerMonth,
      recommended_min_stock: recommendedMinStock,
      recommended_max_stock: recommendedMaxStock,
      recommended_reorder_point: recommendedReorderPoint,
      status,
      days_until_stockout: daysUntilStockout,
      action_needed: actionNeeded,
    })
  }

  // 全体統計
  const totalConsumables = optimizations.length
  const optimalStockCount = optimizations.filter((o) => o.status === 'optimal').length
  const lowStockCount = optimizations.filter((o) => o.status === 'low').length
  const excessStockCount = optimizations.filter((o) => o.status === 'excess').length
  const outOfStockCount = optimizations.filter((o) => o.status === 'out_of_stock').length

  return {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_consumables: totalConsumables,
    optimal_stock_count: optimalStockCount,
    low_stock_count: lowStockCount,
    excess_stock_count: excessStockCount,
    out_of_stock_count: outOfStockCount,
    optimizations,
  }
}
