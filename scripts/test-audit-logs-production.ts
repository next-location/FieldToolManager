/**
 * 本番環境監査ログ自動テストスクリプト
 *
 * 実行方法: curl https://zairoku.com/api/test/audit-logs
 */

import { createClient } from '@supabase/supabase-js'

interface AuditLog {
  id: string
  created_at: string
  action: string
  entity_type: string
  entity_id: string | null
  user_id: string
  organization_id: string
  ip_address: string | null
  user_agent: string | null
  old_values: any
  new_values: any
}

interface TestResult {
  success: boolean
  message: string
  details?: any
}

export async function testAuditLogsInProduction(): Promise<{
  overall: boolean
  tests: Record<string, TestResult>
  auditLogs: AuditLog[]
  summary: string
}> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const tests: Record<string, TestResult> = {}

  // Test 1: 最新の監査ログを取得
  const { data: recentLogs, error: fetchError } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (fetchError) {
    tests['fetch_logs'] = {
      success: false,
      message: `監査ログの取得に失敗: ${fetchError.message}`,
    }
    return {
      overall: false,
      tests,
      auditLogs: [],
      summary: '監査ログの取得に失敗しました。',
    }
  }

  tests['fetch_logs'] = {
    success: true,
    message: `${recentLogs.length}件の監査ログを取得しました`,
  }

  // Test 2: ログインログが存在するか
  const loginLogs = recentLogs.filter((log) => log.action === 'login' && log.entity_type === 'auth')
  tests['login_logs'] = {
    success: loginLogs.length > 0,
    message: loginLogs.length > 0
      ? `ログインログが${loginLogs.length}件記録されています`
      : 'ログインログが記録されていません',
    details: loginLogs.slice(0, 3),
  }

  // Test 3: ログアウトログが存在するか
  const logoutLogs = recentLogs.filter((log) => log.action === 'logout' && log.entity_type === 'auth')
  tests['logout_logs'] = {
    success: logoutLogs.length > 0,
    message: logoutLogs.length > 0
      ? `ログアウトログが${logoutLogs.length}件記録されています`
      : 'ログアウトログが記録されていません',
    details: logoutLogs.slice(0, 3),
  }

  // Test 4: 道具移動ログが存在するか
  const movementLogs = recentLogs.filter((log) =>
    log.action === 'create' && log.entity_type === 'tool_movements'
  )
  tests['tool_movement_logs'] = {
    success: movementLogs.length > 0,
    message: movementLogs.length > 0
      ? `道具移動ログが${movementLogs.length}件記録されています`
      : '道具移動ログが記録されていません',
    details: movementLogs.slice(0, 3),
  }

  // Test 5: 取引先操作ログが存在するか
  const clientLogs = recentLogs.filter((log) => log.entity_type === 'clients')
  tests['client_logs'] = {
    success: clientLogs.length > 0,
    message: clientLogs.length > 0
      ? `取引先操作ログが${clientLogs.length}件記録されています`
      : '取引先操作ログが記録されていません',
    details: clientLogs.slice(0, 3),
  }

  // Test 6: 現場操作ログが存在するか
  const siteLogs = recentLogs.filter((log) => log.entity_type === 'sites')
  tests['site_logs'] = {
    success: siteLogs.length > 0,
    message: siteLogs.length > 0
      ? `現場操作ログが${siteLogs.length}件記録されています`
      : '現場操作ログが記録されていません',
    details: siteLogs.slice(0, 3),
  }

  // Test 7: 全てのログにuser_idとorganization_idが設定されているか
  const logsWithMissingData = recentLogs.filter((log) => !log.user_id || !log.organization_id)
  tests['complete_logs'] = {
    success: logsWithMissingData.length === 0,
    message: logsWithMissingData.length === 0
      ? '全ての監査ログにuser_idとorganization_idが設定されています'
      : `${logsWithMissingData.length}件の監査ログにuser_idまたはorganization_idが欠けています`,
    details: logsWithMissingData.slice(0, 5),
  }

  // Test 8: エンティティタイプの分布
  const entityTypes = new Map<string, number>()
  recentLogs.forEach((log) => {
    const count = entityTypes.get(log.entity_type) || 0
    entityTypes.set(log.entity_type, count + 1)
  })
  tests['entity_type_distribution'] = {
    success: entityTypes.size > 0,
    message: `${entityTypes.size}種類のエンティティタイプが記録されています`,
    details: Object.fromEntries(entityTypes),
  }

  // Test 9: アクションタイプの分布
  const actionTypes = new Map<string, number>()
  recentLogs.forEach((log) => {
    const count = actionTypes.get(log.action) || 0
    actionTypes.set(log.action, count + 1)
  })
  tests['action_type_distribution'] = {
    success: actionTypes.size > 0,
    message: `${actionTypes.size}種類のアクションが記録されています`,
    details: Object.fromEntries(actionTypes),
  }

  // 総合判定
  const failedTests = Object.entries(tests).filter(([_, result]) => !result.success)
  const overall = failedTests.length === 0

  let summary = ''
  if (overall) {
    summary = `✅ 全てのテストに合格しました！合計${recentLogs.length}件の監査ログが正しく記録されています。`
  } else {
    summary = `❌ ${failedTests.length}件のテストが失敗しました:\n${failedTests.map(([name, result]) => `  - ${name}: ${result.message}`).join('\n')}`
  }

  return {
    overall,
    tests,
    auditLogs: recentLogs as AuditLog[],
    summary,
  }
}
