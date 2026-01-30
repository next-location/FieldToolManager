#!/usr/bin/env tsx

/**
 * CSRF保護 - フロントエンド検証スクリプト
 *
 * 目的: 各エンドポイントを呼び出すコンポーネントで useCsrfToken が使われているかチェック
 *
 * チェック項目:
 * 1. useCsrfToken フックがインポートされているか
 * 2. useCsrfToken が使用されているか
 * 3. X-CSRF-Token ヘッダーが追加されているか
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

// APIエンドポイントとそれを呼び出す可能性のあるディレクトリのマッピング
const API_TO_COMPONENT_MAPPING: Record<string, string[]> = {
  // 勤怠系
  '/api/attendance/clock-in': ['app/(authenticated)/attendance', 'components/attendance'],
  '/api/attendance/clock-out': ['app/(authenticated)/attendance', 'components/attendance'],
  '/api/attendance/break/start': ['app/(authenticated)/attendance', 'components/attendance'],
  '/api/attendance/break/end': ['app/(authenticated)/attendance', 'components/attendance'],
  '/api/attendance/records/proxy': ['app/(authenticated)/attendance/records'],
  '/api/attendance/qr/verify': ['app/(authenticated)/attendance'],

  // 発注書系
  '/api/purchase-orders/bulk-approve': ['app/(authenticated)/purchase-orders'],
  '/api/purchase-orders/[id]/mark-paid': ['app/(authenticated)/purchase-orders'],
  '/api/purchase-orders/[id]/mark-received': ['app/(authenticated)/purchase-orders'],
  '/api/purchase-orders/[id]/send': ['app/(authenticated)/purchase-orders'],

  // 見積書系
  '/api/estimates/[id]/approve': ['app/(authenticated)/estimates'],
  '/api/estimates/[id]/customer-approve': ['app/(authenticated)/estimates'],
  '/api/estimates/[id]/send': ['app/(authenticated)/estimates'],

  // スタッフ系
  '/api/staff/[id]/reset-password': ['app/(authenticated)/staff'],
  '/api/staff/[id]/toggle-active': ['app/(authenticated)/staff'],

  // 休暇系
  '/api/leave/[id]/approve': ['app/(authenticated)/leave'],
  '/api/leave/[id]/reject': ['app/(authenticated)/leave'],

  // 作業報告系
  '/api/work-reports': ['app/(authenticated)/work-reports'],
  '/api/work-reports/[id]/photos': ['app/(authenticated)/work-reports'],
  '/api/work-reports/[id]/attachments': ['app/(authenticated)/work-reports'],

  // 管理者系
  '/api/admin/invoices/[id]/convert-to-invoice': ['app/admin/invoices'],
  '/api/admin/invoices/[id]/mark-as-paid': ['app/admin/invoices'],
  '/api/admin/contracts/[id]/complete': ['app/admin/contracts'],
}

interface ComponentVerificationResult {
  file: string
  hasUseCsrfTokenImport: boolean
  hasUseCsrfTokenCall: boolean
  hasCsrfHeader: boolean
  passed: boolean
  apiEndpoints: string[]
}

/**
 * ディレクトリ内のコンポーネントファイルを再帰的に取得
 */
function getComponentFiles(dir: string): string[] {
  const fullPath = path.join(process.cwd(), dir)

  if (!fs.existsSync(fullPath)) {
    return []
  }

  const files: string[] = []

  function traverse(currentPath: string) {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name)

      if (entry.isDirectory()) {
        traverse(entryPath)
      } else if (entry.isFile() && /\.(tsx|ts|jsx|js)$/.test(entry.name)) {
        files.push(entryPath)
      }
    }
  }

  traverse(fullPath)
  return files
}

/**
 * ファイル内で特定のAPIエンドポイントが呼び出されているかチェック
 */
function findApiCalls(content: string): string[] {
  const apiCalls: string[] = []

  // fetch('/api/...') パターンを検出
  const fetchMatches = content.matchAll(/fetch\s*\(\s*['"`]([^'"`]+)['"`]/g)
  for (const match of fetchMatches) {
    if (match[1].startsWith('/api/')) {
      apiCalls.push(match[1])
    }
  }

  // axios.post('/api/...') などのパターンも検出
  const axiosMatches = content.matchAll(/axios\.(post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g)
  for (const match of axiosMatches) {
    if (match[2].startsWith('/api/')) {
      apiCalls.push(match[2])
    }
  }

  return apiCalls
}

/**
 * コンポーネントファイルのCSRF保護を検証
 */
function verifyComponent(filePath: string): ComponentVerificationResult {
  const content = fs.readFileSync(filePath, 'utf-8')
  const relativePath = path.relative(process.cwd(), filePath)

  const result: ComponentVerificationResult = {
    file: relativePath,
    hasUseCsrfTokenImport: false,
    hasUseCsrfTokenCall: false,
    hasCsrfHeader: false,
    passed: false,
    apiEndpoints: [],
  }

  // APIエンドポイント呼び出しを検出
  result.apiEndpoints = findApiCalls(content)

  // 変更系のメソッド（POST/PUT/DELETE/PATCH）を使っているか確認
  const hasMutationCall = /fetch\s*\([^)]*method\s*:\s*['"`](POST|PUT|DELETE|PATCH)['"`]/i.test(content) ||
                          /axios\.(post|put|delete|patch)/i.test(content)

  // 変更系のAPIを呼んでいない場合はスキップ
  if (!hasMutationCall) {
    result.passed = true
    return result
  }

  // useCsrfToken のインポートをチェック
  result.hasUseCsrfTokenImport = content.includes('useCsrfToken') && content.includes("from '@/hooks/useCsrfToken'")

  // useCsrfToken の使用をチェック
  result.hasUseCsrfTokenCall = /const\s+\{[^}]*token[^}]*\}\s*=\s*useCsrfToken\(\)/.test(content) ||
                                /const\s+csrfToken\s*=\s*useCsrfToken\(\)/.test(content)

  // X-CSRF-Token ヘッダーの追加をチェック
  result.hasCsrfHeader = content.includes("'X-CSRF-Token'") || content.includes('"X-CSRF-Token"')

  // 全てのチェックが通ったか
  result.passed = result.hasUseCsrfTokenImport && result.hasUseCsrfTokenCall && result.hasCsrfHeader

  return result
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 CSRF保護フロントエンド検証を開始します...\n')

  const allResults: ComponentVerificationResult[] = []

  // 各APIエンドポイントに対応するディレクトリを検証
  for (const [apiPath, dirs] of Object.entries(API_TO_COMPONENT_MAPPING)) {
    console.log(`📂 検証中: ${apiPath}`)

    for (const dir of dirs) {
      const componentFiles = getComponentFiles(dir)

      for (const file of componentFiles) {
        const result = verifyComponent(file)

        // 実際にAPIを呼び出しているファイルのみ結果に追加
        if (result.apiEndpoints.length > 0) {
          allResults.push(result)
        }
      }
    }
  }

  // 結果をカテゴリ別に分類
  const notProtected = allResults.filter(r => !r.passed)
  const protected_ = allResults.filter(r => r.passed)

  // 結果表示
  console.log('\n📊 検証結果サマリー')
  console.log('═'.repeat(80))
  console.log(`✅ CSRF保護済み: ${protected_.length}/${allResults.length}`)
  console.log(`❌ CSRF保護なし: ${notProtected.length}/${allResults.length}`)
  console.log('═'.repeat(80))
  console.log()

  // CSRF保護なしのファイル
  if (notProtected.length > 0) {
    console.log('❌ CSRF保護が不足しているコンポーネント:')
    console.log('─'.repeat(80))
    for (const r of notProtected) {
      const issues: string[] = []
      if (!r.hasUseCsrfTokenImport) issues.push('useCsrfTokenインポートなし')
      if (!r.hasUseCsrfTokenCall) issues.push('useCsrfToken呼び出しなし')
      if (!r.hasCsrfHeader) issues.push('X-CSRF-Tokenヘッダーなし')

      console.log(`  ❌ ${r.file}`)
      console.log(`     API呼び出し: ${r.apiEndpoints.join(', ')}`)
      console.log(`     問題: ${issues.join(', ')}`)
      console.log()
    }
  }

  // CSRF保護済みのファイル
  if (protected_.length > 0) {
    console.log('✅ CSRF保護済みコンポーネント:')
    console.log('─'.repeat(80))
    for (const r of protected_) {
      console.log(`  ✅ ${r.file}`)
      if (r.apiEndpoints.length > 0) {
        console.log(`     API: ${r.apiEndpoints.join(', ')}`)
      }
    }
    console.log()
  }

  // 検証されていないAPIエンドポイントの警告
  console.log('⚠️  注意事項:')
  console.log('─'.repeat(80))
  console.log('このスクリプトは主要なディレクトリのみを検証しています。')
  console.log('全てのコンポーネントを検証するには、手動でgrepを実行してください:')
  console.log()
  console.log('  npx tsx scripts/find-all-api-calls.ts')
  console.log()

  // 最終判定
  console.log('═'.repeat(80))
  if (notProtected.length === 0) {
    console.log('✅ 検証対象の全コンポーネントでCSRF保護が実装されています！')
    console.log('   ※ただし、全コンポーネントを網羅しているわけではありません。')
    process.exit(0)
  } else {
    console.log('❌ CSRF保護が不足しているコンポーネントがあります。')
    console.log(`   修正が必要: ${notProtected.length}個`)
    process.exit(1)
  }
}

main()
