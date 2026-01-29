/**
 * レート制限のテストスクリプト
 * ローカル環境でレート制限が正しく動作するか確認
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// .env.localを読み込み
dotenv.config({ path: path.join(__dirname, '../.env.local') })

console.log('環境変数チェック:')
console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定')
console.log('  SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ 設定済み' : '❌ 未設定')
console.log()

import { checkRateLimit } from '../lib/security/rate-limiter-supabase'

async function testRateLimit() {
  const testIp = '127.0.0.1'

  console.log('=== レート制限テスト開始 ===\n')
  console.log('設定: 5分間に3回まで\n')

  for (let i = 1; i <= 5; i++) {
    console.log(`--- リクエスト ${i} ---`)

    const result = await checkRateLimit(testIp, 3, 300000, 600000)

    console.log(`  許可: ${result.allowed ? '✅ はい' : '❌ いいえ'}`)
    console.log(`  残り: ${result.remaining}回`)
    console.log(`  リセット: ${new Date(result.resetAt).toLocaleString('ja-JP')}`)

    if (result.isBlocked) {
      console.log(`  ⚠️  ブロック中`)
    }

    console.log()

    // 少し待つ
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log('=== テスト完了 ===')
  console.log('\n期待される結果:')
  console.log('  リクエスト 1-3: ✅ 許可')
  console.log('  リクエスト 4-5: ❌ 拒否')
}

testRateLimit()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('エラー:', error)
    process.exit(1)
  })
