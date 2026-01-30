#!/usr/bin/env tsx

/**
 * CSRF保護 - バックエンド検証スクリプト
 *
 * 目的: 全147個のエンドポイントにCSRF保護が追加されたかを自動チェック
 *
 * チェック項目:
 * 1. verifyCsrfToken のインポートがあるか
 * 2. verifyCsrfToken が関数内で使用されているか
 * 3. csrfErrorResponse のインポートがあるか
 * 4. csrfErrorResponse が使用されているか
 */

import * as fs from 'fs'
import * as path from 'path'

// CSRF保護が必要な全147エンドポイント
const ENDPOINTS_REQUIRING_CSRF = [
  // POST (100個)
  'app/api/attendance/clock-out/route.ts',
  'app/api/attendance/records/proxy/route.ts',
  'app/api/attendance/terminals/route.ts',
  'app/api/attendance/check-holiday/route.ts',
  'app/api/attendance/work-patterns/route.ts',
  'app/api/attendance/clock-in/route.ts',
  'app/api/attendance/qr/office/generate/route.ts',
  'app/api/attendance/qr/verify/route.ts',
  'app/api/attendance/qr/site/leader/generate/route.ts',
  'app/api/attendance/alerts/daily-report/route.ts',
  'app/api/attendance/break/start/route.ts',
  'app/api/attendance/break/end/route.ts',
  'app/api/organization/plan-upgrade-request/route.ts',
  'app/api/organization/backup/full/route.ts',
  'app/api/demo/send-email/route.ts',
  'app/api/demo/create/route.ts',
  'app/api/clients/import/route.ts',
  'app/api/purchase-orders/bulk-approve/route.ts',
  'app/api/purchase-orders/[id]/update-draft/route.ts',
  'app/api/purchase-orders/[id]/mark-paid/route.ts',
  'app/api/purchase-orders/[id]/mark-received/route.ts',
  'app/api/purchase-orders/[id]/send/route.ts',
  'app/api/suppliers/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/auth/2fa/reset/route.ts',
  'app/api/auth/2fa/request-reset/route.ts',
  'app/api/auth/forgot-password/route.ts',
  'app/api/tool-sets/delete-for-individual-move/route.ts',
  'app/api/estimates/[id]/customer-approve/route.ts',
  'app/api/estimates/[id]/return/route.ts',
  'app/api/estimates/[id]/approve/route.ts',
  'app/api/estimates/[id]/customer-reject/route.ts',
  'app/api/estimates/[id]/send/route.ts',
  'app/api/admin/organizations/route.ts',
  'app/api/admin/organizations/check-duplicate/route.ts',
  'app/api/admin/payments/route.ts',
  'app/api/admin/tools/common/route.ts',
  'app/api/admin/tools/common/import/route.ts',
  'app/api/admin/super-admins/route.ts',
  'app/api/admin/test/trigger-cron/route.ts',
  'app/api/admin/test/update-billing-date/route.ts',
  'app/api/admin/test/generate-invoice/route.ts',
  'app/api/admin/invoices/route.ts',
  'app/api/admin/invoices/[id]/send-estimate/route.ts',
  'app/api/admin/invoices/[id]/reject/route.ts',
  'app/api/admin/invoices/[id]/send-invoice/route.ts',
  'app/api/admin/invoices/[id]/convert-to-invoice/route.ts',
  'app/api/admin/invoices/[id]/send/route.ts',
  'app/api/admin/invoices/[id]/mark-as-paid/route.ts',
  'app/api/admin/invoices/[id]/resend/route.ts',
  'app/api/admin/contracts/change-plan/preview/route.ts',
  'app/api/admin/contracts/[id]/change-plan/route.ts',
  'app/api/admin/contracts/[id]/generate-estimate/route.ts',
  'app/api/admin/contracts/[id]/complete/route.ts',
  'app/api/admin/contracts/[id]/validate-change/route.ts',
  'app/api/admin/contracts/[id]/generate-initial-invoice/route.ts',
  'app/api/admin/logout/route.ts',
  'app/api/admin/2fa/disable/route.ts',
  'app/api/admin/2fa/test/route.ts',
  'app/api/admin/2fa/verify/route.ts',
  'app/api/admin/2fa/grace-period/route.ts',
  'app/api/admin/2fa/verify-backup/route.ts',
  'app/api/admin/packages/route.ts',
  'app/api/admin/manufacturers/unify/route.ts',
  'app/api/admin/manufacturers/route.ts',
  'app/api/admin/maintenance/cleanup/route.ts',
  'app/api/admin/backup/manual/route.ts',
  'app/api/admin/sales-activities/route.ts',
  'app/api/admin/impersonate/logout/route.ts',
  'app/api/admin/notifications/[id]/read/route.ts',
  'app/api/user/2fa/enable/route.ts',
  'app/api/user/2fa/disable/route.ts',
  'app/api/user/2fa/verify/route.ts',
  'app/api/work-reports/bulk-pdf/route.ts',
  'app/api/work-reports/custom-fields/route.ts',
  'app/api/work-reports/[id]/attachments/route.ts',
  'app/api/work-reports/[id]/photos/route.ts',
  'app/api/public/contact/route.ts',
  'app/api/reset-password/update/route.ts',
  'app/api/company-seal/generate/route.ts',
  'app/api/staff/bulk-import/route.ts',
  'app/api/staff/route.ts',
  'app/api/staff/[id]/toggle-active/route.ts',
  'app/api/staff/[id]/reset-password/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/notifications/mark-read/route.ts',
  'app/api/notifications/mark-all-read/route.ts',
  'app/api/onboarding/complete/route.ts',
  'app/api/leave/route.ts',
  'app/api/leave/[id]/reject/route.ts',
  'app/api/leave/[id]/approve/route.ts',
  'app/api/cron/check-warranty-expiration/route.ts',
  'app/api/cron/check-low-stock/route.ts',
  'app/api/cron/check-equipment-expiration/route.ts',
  'app/api/analytics/track/route.ts',
  'app/api/stripe/customers/create/route.ts',
  'app/api/stripe/subscriptions/upgrade/route.ts',
  'app/api/stripe/subscriptions/downgrade/route.ts',
  'app/api/stripe/subscriptions/create/route.ts',

  // PUT (15個) - [id]を含むパスはワイルドカード扱いにする必要があるため、実際のファイルパスと一致させる
  'app/api/attendance/settings/route.ts',
  'app/api/purchase-orders/settings/route.ts',
  'app/api/estimates/[id]/route.ts',
  'app/api/admin/organizations/[id]/route.ts',
  'app/api/admin/settings/timeout/route.ts',
  'app/api/admin/settings/system/route.ts',
  'app/api/admin/payments/[id]/route.ts',
  'app/api/admin/tools/common/[id]/route.ts',
  'app/api/admin/security/settings/route.ts',
  'app/api/admin/contracts/[id]/route.ts',
  'app/api/admin/packages/[id]/route.ts',
  'app/api/admin/manufacturers/[id]/route.ts',
  'app/api/work-reports/custom-fields/[id]/route.ts',

  // DELETE (20個)
  'app/api/attendance/records/[id]/route.ts',
  'app/api/attendance/terminals/[id]/route.ts',
  'app/api/attendance/work-patterns/[id]/route.ts',
  'app/api/purchase-orders/[id]/route.ts',
  'app/api/suppliers/[id]/route.ts',
  'app/api/estimates/[id]/approve/route.ts',
  // 'app/api/estimates/[id]/route.ts', // PUTと重複
  'app/api/admin/invoices/[id]/delete-estimate/route.ts',
  'app/api/work-reports/[id]/route.ts',
  'app/api/work-reports/[id]/attachments/[attachmentId]/route.ts',
  'app/api/work-reports/[id]/photos/[photoId]/route.ts',
  'app/api/staff/[id]/route.ts',
  'app/api/leave/[id]/route.ts',

  // PATCH (12個)
  // 'app/api/attendance/records/[id]/route.ts', // DELETEと重複
  // 'app/api/attendance/terminals/[id]/route.ts', // DELETEと重複
  // 'app/api/attendance/work-patterns/[id]/route.ts', // DELETEと重複
  'app/api/attendance/alerts/route.ts',
  'app/api/organization/contract/route.ts',
  'app/api/organization/route.ts',
  // 'app/api/suppliers/[id]/route.ts', // PUTと重複
  'app/api/admin/organizations/[id]/sales/route.ts',
  // 'app/api/admin/contracts/[id]/route.ts', // PUTと重複
  // 'app/api/work-reports/[id]/route.ts', // DELETEと重複
  // 'app/api/staff/[id]/route.ts', // DELETEと重複
  // 'app/api/leave/[id]/route.ts', // DELETEと重複
]

interface VerificationResult {
  file: string
  exists: boolean
  hasImport: boolean
  hasVerifyCall: boolean
  hasErrorResponse: boolean
  passed: boolean
  methods: string[]
}

/**
 * ファイルの存在とCSRF保護を検証
 */
function verifyEndpoint(filePath: string): VerificationResult {
  const fullPath = path.join(process.cwd(), filePath)

  const result: VerificationResult = {
    file: filePath,
    exists: false,
    hasImport: false,
    hasVerifyCall: false,
    hasErrorResponse: false,
    passed: false,
    methods: [],
  }

  // ファイルの存在確認
  if (!fs.existsSync(fullPath)) {
    return result
  }

  result.exists = true

  // ファイル内容を読み込み
  const content = fs.readFileSync(fullPath, 'utf-8')

  // HTTPメソッドを検出
  const methodMatches = content.match(/export\s+async\s+function\s+(GET|POST|PUT|DELETE|PATCH)/g)
  if (methodMatches) {
    result.methods = methodMatches.map(m => m.match(/(GET|POST|PUT|DELETE|PATCH)/)![1])
  }

  // CSRF関連のインポートをチェック
  result.hasImport = content.includes('verifyCsrfToken') && content.includes("from '@/lib/security/csrf'")

  // verifyCsrfToken の使用をチェック
  result.hasVerifyCall = content.includes('await verifyCsrfToken(')

  // csrfErrorResponse の使用をチェック
  result.hasErrorResponse = content.includes('csrfErrorResponse()')

  // 全てのチェックが通ったか
  result.passed = result.hasImport && result.hasVerifyCall && result.hasErrorResponse

  return result
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 CSRF保護バックエンド検証を開始します...\n')

  const results: VerificationResult[] = []

  // 重複を排除（同じファイルに複数メソッドがある場合）
  const uniqueEndpoints = Array.from(new Set(ENDPOINTS_REQUIRING_CSRF))

  for (const endpoint of uniqueEndpoints) {
    const result = verifyEndpoint(endpoint)
    results.push(result)
  }

  // 結果をカテゴリ別に分類
  const notExists = results.filter(r => !r.exists)
  const notProtected = results.filter(r => r.exists && !r.passed)
  const protected_ = results.filter(r => r.exists && r.passed)

  // 結果表示
  console.log('📊 検証結果サマリー')
  console.log('═'.repeat(80))
  console.log(`✅ CSRF保護済み: ${protected_.length}/${uniqueEndpoints.length}`)
  console.log(`❌ CSRF保護なし: ${notProtected.length}/${uniqueEndpoints.length}`)
  console.log(`⚠️  ファイル未存在: ${notExists.length}/${uniqueEndpoints.length}`)
  console.log('═'.repeat(80))
  console.log()

  // ファイル未存在の警告
  if (notExists.length > 0) {
    console.log('⚠️  ファイルが見つかりません:')
    console.log('─'.repeat(80))
    for (const r of notExists) {
      console.log(`  ❌ ${r.file}`)
    }
    console.log()
  }

  // CSRF保護なしのファイル
  if (notProtected.length > 0) {
    console.log('❌ CSRF保護が不足しているエンドポイント:')
    console.log('─'.repeat(80))
    for (const r of notProtected) {
      const issues: string[] = []
      if (!r.hasImport) issues.push('インポートなし')
      if (!r.hasVerifyCall) issues.push('verifyCsrfToken呼び出しなし')
      if (!r.hasErrorResponse) issues.push('csrfErrorResponseなし')

      console.log(`  ❌ ${r.file}`)
      console.log(`     メソッド: ${r.methods.join(', ')}`)
      console.log(`     問題: ${issues.join(', ')}`)
      console.log()
    }
  }

  // CSRF保護済みのファイル
  if (protected_.length > 0) {
    console.log('✅ CSRF保護済みエンドポイント:')
    console.log('─'.repeat(80))
    for (const r of protected_) {
      console.log(`  ✅ ${r.file} (${r.methods.join(', ')})`)
    }
    console.log()
  }

  // 最終判定
  console.log('═'.repeat(80))
  if (notProtected.length === 0 && notExists.length === 0) {
    console.log('✅ 全てのエンドポイントでCSRF保護が実装されています！')
    process.exit(0)
  } else {
    console.log('❌ CSRF保護が不足しているエンドポイントがあります。')
    console.log(`   修正が必要: ${notProtected.length + notExists.length}個`)
    process.exit(1)
  }
}

main()
