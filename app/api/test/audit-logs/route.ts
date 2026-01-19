import { NextRequest, NextResponse } from 'next/server'
import { testAuditLogsInProduction } from '@/scripts/test-audit-logs-production'

/**
 * 本番環境監査ログ自動テストAPI
 *
 * GET /api/test/audit-logs
 */
export async function GET(request: NextRequest) {
  try {
    const result = await testAuditLogsInProduction()

    return NextResponse.json(result, {
      status: result.overall ? 200 : 500,
    })
  } catch (error) {
    console.error('[AUDIT LOG TEST] Error:', error)
    return NextResponse.json(
      {
        overall: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        summary: 'テストの実行中にエラーが発生しました',
      },
      { status: 500 }
    )
  }
}
