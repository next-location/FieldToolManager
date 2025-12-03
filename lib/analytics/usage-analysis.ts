// 使用頻度分析ライブラリ

export interface UsageAnalysis {
  tool_id: string
  tool_name: string
  category_name: string | null
  is_consumable: boolean

  // 使用頻度
  total_movements: number // 総移動回数
  checkout_count: number // 持出回数
  checkin_count: number // 返却回数
  transfer_count: number // 移動回数

  // 使用パターン
  average_movements_per_month: number
  most_active_site: string | null // 最も使用されている現場
  most_active_user: string | null // 最も使用しているユーザー

  // 期間情報
  first_usage_date: string | null
  last_usage_date: string | null
  days_since_last_use: number | null

  // 利用率スコア（0-100）
  usage_score: number

  // ステータス
  status: 'active' | 'inactive' | 'rarely_used' // 活発/非活発/ほとんど未使用
}

export interface UsageAnalyticsReport {
  period_start: string
  period_end: string
  total_days: number

  // 全体統計
  total_movements: number
  average_movements_per_day: number

  // 分類別統計
  active_tools: number // 活発な道具数
  inactive_tools: number // 非活発な道具数
  rarely_used_tools: number // ほとんど未使用の道具数

  // 個別分析
  usage_analyses: UsageAnalysis[]
}

/**
 * 使用頻度分析を実行
 */
export async function analyzeUsage(
  tools: any[],
  movements: any[],
  sites: any[],
  users: any[],
  periodStart: Date,
  periodEnd: Date
): Promise<UsageAnalyticsReport> {
  const analyses: UsageAnalysis[] = []
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))

  for (const tool of tools) {
    // この道具の移動履歴をフィルタ
    const toolMovements = movements.filter((m: any) => m.tool_id === tool.id)

    // 移動タイプ別のカウント
    const checkoutCount = toolMovements.filter((m: any) => m.movement_type === 'check_out').length
    const checkinCount = toolMovements.filter((m: any) => m.movement_type === 'check_in').length
    const transferCount = toolMovements.filter((m: any) => m.movement_type === 'transfer').length

    // 月平均移動回数
    const months = totalDays / 30
    const averageMovementsPerMonth = months > 0 ? toolMovements.length / months : 0

    // 最も使用されている現場を特定
    const siteUsageMap = new Map<string, number>()
    for (const movement of toolMovements) {
      const siteId = movement.to_site_id || movement.from_site_id
      if (siteId) {
        siteUsageMap.set(siteId, (siteUsageMap.get(siteId) || 0) + 1)
      }
    }
    let mostActiveSiteId: string | null = null
    let maxSiteUsage = 0
    for (const [siteId, count] of siteUsageMap.entries()) {
      if (count > maxSiteUsage) {
        maxSiteUsage = count
        mostActiveSiteId = siteId
      }
    }
    const mostActiveSite = mostActiveSiteId
      ? sites.find((s: any) => s.id === mostActiveSiteId)?.name || null
      : null

    // 最も使用しているユーザーを特定
    const userUsageMap = new Map<string, number>()
    for (const movement of toolMovements) {
      const userId = movement.performed_by || movement.user_id
      if (userId) {
        userUsageMap.set(userId, (userUsageMap.get(userId) || 0) + 1)
      }
    }
    let mostActiveUserId: string | null = null
    let maxUserUsage = 0
    for (const [userId, count] of userUsageMap.entries()) {
      if (count > maxUserUsage) {
        maxUserUsage = count
        mostActiveUserId = userId
      }
    }
    const mostActiveUser = mostActiveUserId
      ? users.find((u: any) => u.id === mostActiveUserId)?.name || null
      : null

    // 最初と最後の使用日
    const sortedMovements = toolMovements.sort(
      (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    const firstUsageDate = sortedMovements.length > 0 ? sortedMovements[0].created_at : null
    const lastUsageDate =
      sortedMovements.length > 0
        ? sortedMovements[sortedMovements.length - 1].created_at
        : null

    // 最終使用からの経過日数
    const daysSinceLastUse = lastUsageDate
      ? Math.ceil((new Date().getTime() - new Date(lastUsageDate).getTime()) / (1000 * 60 * 60 * 24))
      : null

    // 利用率スコア計算（0-100）
    const usageScore = calculateUsageScore(
      toolMovements.length,
      totalDays,
      daysSinceLastUse
    )

    // ステータス判定
    let status: 'active' | 'inactive' | 'rarely_used'
    if (usageScore >= 50) {
      status = 'active'
    } else if (usageScore >= 20) {
      status = 'inactive'
    } else {
      status = 'rarely_used'
    }

    analyses.push({
      tool_id: tool.id,
      tool_name: tool.name,
      category_name: tool.category_name || null,
      is_consumable: tool.is_consumable || false,
      total_movements: toolMovements.length,
      checkout_count: checkoutCount,
      checkin_count: checkinCount,
      transfer_count: transferCount,
      average_movements_per_month: averageMovementsPerMonth,
      most_active_site: mostActiveSite,
      most_active_user: mostActiveUser,
      first_usage_date: firstUsageDate,
      last_usage_date: lastUsageDate,
      days_since_last_use: daysSinceLastUse,
      usage_score: usageScore,
      status,
    })
  }

  // 全体統計
  const totalMovements = analyses.reduce((sum, a) => sum + a.total_movements, 0)
  const averageMovementsPerDay = totalDays > 0 ? totalMovements / totalDays : 0
  const activeTools = analyses.filter((a) => a.status === 'active').length
  const inactiveTools = analyses.filter((a) => a.status === 'inactive').length
  const rarelyUsedTools = analyses.filter((a) => a.status === 'rarely_used').length

  return {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total_days: totalDays,
    total_movements: totalMovements,
    average_movements_per_day: averageMovementsPerDay,
    active_tools: activeTools,
    inactive_tools: inactiveTools,
    rarely_used_tools: rarelyUsedTools,
    usage_analyses: analyses,
  }
}

/**
 * 利用率スコア計算（0-100）
 */
function calculateUsageScore(
  movementCount: number,
  totalDays: number,
  daysSinceLastUse: number | null
): number {
  // 基本スコア: 移動回数ベース
  let score = Math.min((movementCount / totalDays) * 100, 100)

  // 最終使用日からの経過日数によるペナルティ
  if (daysSinceLastUse !== null) {
    if (daysSinceLastUse > 90) {
      score *= 0.3 // 90日以上未使用
    } else if (daysSinceLastUse > 60) {
      score *= 0.5 // 60-90日未使用
    } else if (daysSinceLastUse > 30) {
      score *= 0.7 // 30-60日未使用
    }
  }

  return Math.max(0, Math.min(100, score))
}
