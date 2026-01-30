/**
 * デモ申し込みフォームのセキュリティテスト
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const API_URL = 'http://localhost:3002/api/demo/request'

interface TestResult {
  name: string
  passed: boolean
  expected: string
  actual: string
}

const results: TestResult[] = []

async function testDemoSecurity(testName: string, data: any, expectedStatus: number, expectedError?: string) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    const passed = response.status === expectedStatus &&
                   (!expectedError || result.error?.includes(expectedError))

    results.push({
      name: testName,
      passed,
      expected: `Status: ${expectedStatus}${expectedError ? `, Error: ${expectedError}` : ''}`,
      actual: `Status: ${response.status}, Message: ${result.error || result.message || 'Success'}`,
    })

    return { passed, status: response.status, data: result }
  } catch (error) {
    results.push({
      name: testName,
      passed: false,
      expected: `Status: ${expectedStatus}`,
      actual: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
    return { passed: false, status: 0, data: null }
  }
}

async function runTests() {
  console.log('🧪 デモ申し込みフォーム セキュリティテスト開始\n')
  console.log('='.repeat(60))
  console.log()

  // テスト1: 正常なデータ
  console.log('📋 テスト1: 正常なデータの送信')
  const validData = {
    companyName: 'テスト株式会社',
    personName: '山田太郎',
    email: 'test@example.com',
    phone: '03-1234-5678',
    department: '営業部',
    employeeCount: '11-30名',
    toolCount: '~100',
    timeline: '3ヶ月以内',
    message: 'テストメッセージです',
  }
  await testDemoSecurity('正常なデータ', validData, 200)
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト2: <script>タグの検出
  console.log('📋 テスト2: <script>タグの検出')
  await testDemoSecurity(
    '<script>タグの検出',
    { ...validData, companyName: '<script>alert("XSS")</script>テスト株式会社' },
    400,
    '不正な入力'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト3: javascript:の検出
  console.log('📋 テスト3: javascript:の検出')
  await testDemoSecurity(
    'javascript:の検出',
    { ...validData, message: 'こちら: javascript:alert("test")' },
    400,
    '不正な入力'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト4: イベントハンドラーの検出
  console.log('📋 テスト4: イベントハンドラーの検出')
  await testDemoSecurity(
    'onclick=の検出',
    { ...validData, personName: '<div onclick="alert()">山田</div>' },
    400,
    '不正な入力'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト5: 不正なメールアドレス
  console.log('📋 テスト5: 不正なメールアドレス（@なし）')
  await testDemoSecurity(
    '不正メールアドレス',
    { ...validData, email: 'testexample.com' },
    400,
    '有効なメールアドレス'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト6: 不正なメールアドレス（ドメインなし）
  console.log('📋 テスト6: 不正なメールアドレス（ドメインなし）')
  await testDemoSecurity(
    '不正メールアドレス（@のみ）',
    { ...validData, email: 'test@' },
    400,
    '有効なメールアドレス'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト7: 不正な電話番号（文字）
  console.log('📋 テスト7: 不正な電話番号（ひらがな）')
  await testDemoSecurity(
    '不正電話番号（文字）',
    { ...validData, phone: 'あいうえお' },
    400,
    '有効な電話番号'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト8: 必須項目の欠落
  console.log('📋 テスト8: 必須項目の欠落')
  await testDemoSecurity(
    '必須項目の欠落',
    { ...validData, companyName: '' },
    400,
    '必須項目'
  )
  await new Promise(resolve => setTimeout(resolve, 500))

  // テスト9-11: レート制限テスト（2回目・3回目・4回目）
  console.log('📋 テスト9-11: レート制限テスト')

  const rateLimitData = {
    companyName: 'レート制限テスト株式会社',
    personName: 'テスト太郎',
    email: 'ratelimit@example.com',
    phone: '090-1234-5678',
  }

  console.log('  2回目の送信...')
  await testDemoSecurity('レート制限テスト（2回目）', rateLimitData, 200)
  await new Promise(resolve => setTimeout(resolve, 500))

  console.log('  3回目の送信...')
  await testDemoSecurity('レート制限テスト（3回目）', rateLimitData, 200)
  await new Promise(resolve => setTimeout(resolve, 500))

  console.log('  4回目の送信（ブロックされるはず）...')
  await testDemoSecurity('レート制限テスト（4回目・ブロック）', rateLimitData, 429, 'リクエスト制限')

  // 結果表示
  console.log()
  console.log('='.repeat(60))
  console.log('📊 テスト結果サマリー')
  console.log('='.repeat(60))
  console.log()

  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} テスト ${index + 1}: ${result.name}`)
    if (!result.passed) {
      console.log(`   期待値: ${result.expected}`)
      console.log(`   実際値: ${result.actual}`)
    }
  })

  console.log()
  console.log('='.repeat(60))
  console.log(`結果: ${passedTests}/${totalTests} テスト成功`)
  console.log('='.repeat(60))

  if (passedTests === totalTests) {
    console.log()
    console.log('🎉 すべてのセキュリティテストに合格しました！')
  } else {
    console.log()
    console.log('⚠️  一部のテストが失敗しました。上記の詳細を確認してください。')
  }

  return passedTests === totalTests
}

runTests()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error('テスト実行エラー:', error)
    process.exit(1)
  })
