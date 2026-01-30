#!/usr/bin/env tsx

/**
 * CSRF保護 - エンドツーエンド検証スクリプト
 *
 * 目的: バックエンド + フロントエンドの対応関係を検証
 *       片方だけ修正されている状態を防ぐ
 *
 * チェック項目:
 * 1. バックエンドにCSRF保護があるか
 * 2. そのエンドポイントを呼び出すフロントエンドがあるか
 * 3. フロントエンドがCSRFトークンを送信しているか
 * 4. 逆に、フロントエンドがCSRFトークンを送っているのにバックエンドで検証していないケース
 */

import * as fs from 'fs'
import * as path from 'path'

interface EndpointStatus {
  apiPath: string
  backendFile: string
  backendProtected: boolean
  frontendFiles: string[]
  frontendProtected: string[]
  frontendUnprotected: string[]
  status: 'OK' | 'BACKEND_ONLY' | 'FRONTEND_ONLY' | 'BOTH_MISSING' | 'NO_FRONTEND'
}

/**
 * バックエンドファイルのCSRF保護状態をチェック
 */
function isBackendProtected(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath)

  if (!fs.existsSync(fullPath)) {
    return false
  }

  const content = fs.readFileSync(fullPath, 'utf-8')

  return (
    content.includes('verifyCsrfToken') &&
    content.includes('await verifyCsrfToken(') &&
    content.includes('csrfErrorResponse()')
  )
}

/**
 * ディレクトリ内の全ファイルを再帰的に取得
 */
function getAllFiles(dir: string, extensions: string[] = ['.ts', '.tsx', '.js', '.jsx']): string[] {
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
        // node_modules, .next などは除外
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          traverse(entryPath)
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name)
        if (extensions.includes(ext)) {
          files.push(entryPath)
        }
      }
    }
  }

  traverse(fullPath)
  return files.map(f => path.relative(process.cwd(), f))
}

/**
 * ファイル内で特定のAPIエンドポイントが呼び出されているかチェック
 */
function findApiCallsInFile(filePath: string, apiPath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')

  // fetch('/api/...') パターンを検出
  const fetchPattern = new RegExp(`fetch\\s*\\(\\s*['"\`]${apiPath.replace(/\[id\]/g, '\\${.*?}')}['"\`]`, 'g')
  if (fetchPattern.test(content)) {
    return true
  }

  // axios.post('/api/...') などのパターンも検出
  const axiosPattern = new RegExp(`axios\\.(post|put|delete|patch)\\s*\\(\\s*['"\`]${apiPath.replace(/\[id\]/g, '\\${.*?}')}['"\`]`, 'g')
  if (axiosPattern.test(content)) {
    return true
  }

  // 動的なURL構築もチェック（例: `/api/staff/${id}/reset-password`）
  const dynamicPattern = apiPath.replace(/\[id\]/g, '\\$\\{[^}]+\\}')
  if (content.includes(dynamicPattern)) {
    return true
  }

  return false
}

/**
 * フロントエンドファイルでCSRFトークンを送信しているかチェック
 */
function isFrontendProtected(filePath: string): boolean {
  const fullPath = path.join(process.cwd(), filePath)
  const content = fs.readFileSync(fullPath, 'utf-8')

  return (
    (content.includes('useCsrfToken') && content.includes("from '@/hooks/useCsrfToken'")) &&
  )
}

/**
 * 特定のAPIエンドポイントを呼び出すフロントエンドファイルを検索
 */
function findFrontendFiles(apiPath: string): string[] {
  // app/(authenticated) と app/admin ディレクトリを検索
  const searchDirs = ['app/(authenticated)', 'app/admin', 'components']
  const allFiles: string[] = []

  for (const dir of searchDirs) {
    allFiles.push(...getAllFiles(dir))
  }

  const callingFiles: string[] = []

  for (const file of allFiles) {
    if (findApiCallsInFile(file, apiPath)) {
      callingFiles.push(file)
    }
  }

  return callingFiles
}

/**
 * メイン処理
 */
function main() {
  console.log('🔍 CSRF保護エンドツーエンド検証を開始します...\n')

  // テスト対象のエンドポイント（Phase 1の重要なもののみ）
  const testEndpoints = [
    { apiPath: '/api/attendance/clock-in', backendFile: 'app/api/attendance/clock-in/route.ts' },
    { apiPath: '/api/attendance/clock-out', backendFile: 'app/api/attendance/clock-out/route.ts' },
    { apiPath: '/api/purchase-orders/bulk-approve', backendFile: 'app/api/purchase-orders/bulk-approve/route.ts' },
    { apiPath: '/api/estimates/[id]/approve', backendFile: 'app/api/estimates/[id]/approve/route.ts' },
    { apiPath: '/api/staff/[id]/reset-password', backendFile: 'app/api/staff/[id]/reset-password/route.ts' },
    { apiPath: '/api/leave/[id]/approve', backendFile: 'app/api/leave/[id]/approve/route.ts' },
  ]

  const results: EndpointStatus[] = []

  console.log('📋 エンドポイント検証中...\n')

  for (const endpoint of testEndpoints) {
    const backendProtected = isBackendProtected(endpoint.backendFile)
    const frontendFiles = findFrontendFiles(endpoint.apiPath)

    const frontendProtected: string[] = []
    const frontendUnprotected: string[] = []

    for (const file of frontendFiles) {
      if (isFrontendProtected(file)) {
        frontendProtected.push(file)
      } else {
        frontendUnprotected.push(file)
      }
    }

    let status: EndpointStatus['status'] = 'OK'

    if (frontendFiles.length === 0) {
      status = backendProtected ? 'NO_FRONTEND' : 'BOTH_MISSING'
    } else if (backendProtected && frontendUnprotected.length > 0) {
      status = 'BACKEND_ONLY'
    } else if (!backendProtected && frontendProtected.length > 0) {
      status = 'FRONTEND_ONLY'
    } else if (!backendProtected && frontendUnprotected.length > 0) {
      status = 'BOTH_MISSING'
    }

    results.push({
      apiPath: endpoint.apiPath,
      backendFile: endpoint.backendFile,
      backendProtected,
      frontendFiles,
      frontendProtected,
      frontendUnprotected,
      status,
    })
  }

  // 結果をカテゴリ別に分類
  const ok = results.filter(r => r.status === 'OK')
  const backendOnly = results.filter(r => r.status === 'BACKEND_ONLY')
  const frontendOnly = results.filter(r => r.status === 'FRONTEND_ONLY')
  const bothMissing = results.filter(r => r.status === 'BOTH_MISSING')
  const noFrontend = results.filter(r => r.status === 'NO_FRONTEND')

  // 結果表示
  console.log('📊 検証結果サマリー')
  console.log('═'.repeat(80))
  console.log(`✅ 完全に保護済み: ${ok.length}/${results.length}`)
  console.log(`⚠️  バックエンドのみ保護: ${backendOnly.length}/${results.length}`)
  console.log(`⚠️  フロントエンドのみ保護: ${frontendOnly.length}/${results.length}`)
  console.log(`❌ 両方とも未保護: ${bothMissing.length}/${results.length}`)
  console.log(`ℹ️  フロントエンドなし: ${noFrontend.length}/${results.length}`)
  console.log('═'.repeat(80))
  console.log()

  // 詳細表示
  if (backendOnly.length > 0) {
    console.log('⚠️  バックエンドのみ保護（フロントエンドの修正が必要）:')
    console.log('─'.repeat(80))
    for (const r of backendOnly) {
      console.log(`  ${r.apiPath}`)
      console.log(`    バックエンド: ✅ ${r.backendFile}`)
      console.log(`    フロントエンド:`)
      for (const f of r.frontendUnprotected) {
        console.log(`      ❌ ${f}`)
      }
      console.log()
    }
  }

  if (frontendOnly.length > 0) {
    console.log('⚠️  フロントエンドのみ保護（バックエンドの修正が必要）:')
    console.log('─'.repeat(80))
    for (const r of frontendOnly) {
      console.log(`  ${r.apiPath}`)
      console.log(`    バックエンド: ❌ ${r.backendFile}`)
      console.log(`    フロントエンド:`)
      for (const f of r.frontendProtected) {
        console.log(`      ✅ ${f}`)
      }
      console.log()
    }
  }

  if (bothMissing.length > 0) {
    console.log('❌ 両方とも未保護:')
    console.log('─'.repeat(80))
    for (const r of bothMissing) {
      console.log(`  ${r.apiPath}`)
      console.log(`    バックエンド: ❌ ${r.backendFile}`)
      console.log(`    フロントエンド:`)
      for (const f of r.frontendUnprotected) {
        console.log(`      ❌ ${f}`)
      }
      console.log()
    }
  }

  if (ok.length > 0) {
    console.log('✅ 完全に保護済み:')
    console.log('─'.repeat(80))
    for (const r of ok) {
      console.log(`  ✅ ${r.apiPath}`)
      console.log(`     バックエンド: ${r.backendFile}`)
      if (r.frontendProtected.length > 0) {
        console.log(`     フロントエンド: ${r.frontendProtected.join(', ')}`)
      }
    }
    console.log()
  }

  if (noFrontend.length > 0) {
    console.log('ℹ️  フロントエンドなし（Webhook/Cronなど）:')
    console.log('─'.repeat(80))
    for (const r of noFrontend) {
      console.log(`  ${r.apiPath}`)
      console.log(`    バックエンド: ${r.backendProtected ? '✅' : '❌'} ${r.backendFile}`)
    }
    console.log()
  }

  // 最終判定
  console.log('═'.repeat(80))
  if (backendOnly.length === 0 && frontendOnly.length === 0 && bothMissing.length === 0) {
    console.log('✅ 全てのエンドポイントでバックエンド・フロントエンド両方のCSRF保護が実装されています！')
    process.exit(0)
  } else {
    console.log('❌ CSRF保護が不完全なエンドポイントがあります。')
    console.log(`   修正が必要: ${backendOnly.length + frontendOnly.length + bothMissing.length}個`)
    process.exit(1)
  }
}

main()
