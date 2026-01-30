/**
 * 本番環境のデモ申し込みフォームセキュリティテスト
 */

const PRODUCTION_URL = 'https://zairoku.com/api/demo/request'

interface TestResult {
  name: string
  passed: boolean
  expected: string
  actual: string
}

const results: TestResult[] = []

async function testProduction(testName: string, data: any, expectedStatus: number, expectedError?: string) {
  try {
    console.log(`\n🧪 ${testName}`)

    const response = await fetch(PRODUCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    const result = await response.json()
    const passed = response.status === expectedStatus &&
                   (!expectedError || result.error?.includes(expectedError))

    const statusIcon = response.status === expectedStatus ? '✅' : '❌'
    console.log(`   ${statusIcon} Status: ${response.status} (期待: ${expectedStatus})`)

    if (result.error) {
      const errorIcon = expectedError && result.error.includes(expectedError) ? '✅' : '❌'
      console.log(`   ${errorIcon} エラー: ${result.error}`)
    } else if (result.message) {
      console.log(`   ✅ 成功: ${result.message}`)
    }

    results.push({
      name: testName,
      passed,
      expected: `Status: ${expectedStatus}${expectedError ? `, Error: ${expectedError}` : ''}`,
      actual: `Status: ${response.status}, ${result.error || result.message || 'Success'}`,
    })

    return { passed, status: response.status, data: result }
  } catch (error) {
    console.log(`   ❌ エラー: ${error instanceof Error ? error.message : 'Unknown error'}`)
    results.push({
      name: testName,
      passed: false,
      expected: `Status: ${expectedStatus}`,
      actual: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    })
    return { passed: false, status: 0, data: null }
  }
}

async function runProductionTests() {
  console.log('🔒 本番環境セキュリティテスト')
  console.log('URL: https://zairoku.com/api/demo/request')
  console.log('='.repeat(70))

  const validData = {
    companyName: 'セキュリティテスト株式会社',
    personName: 'テスト太郎',
    email: `security-test-${Date.now()}@example.com`,
    phone: '03-1234-5678',
  }

  // テスト1: <script>タグの拒否
  await testProduction(
    'テスト1: <script>タグの拒否',
    { ...validData, companyName: '<script>alert("XSS")</script>テスト株式会社' },
    400,
    '不正な入力'
  )
  await new Promise(resolve => setTimeout(resolve, 1000))

  // テスト2: javascript:の拒否
  await testProduction(
    'テスト2: javascript:の拒否',
    { ...validData, message: 'javascript:alert("test")' },
    400,
    '不正な入力'
  )
  await new Promise(resolve => setTimeout(resolve, 1000))

  // テスト3: 不正メールアドレスの拒否
  await testProduction(
    'テスト3: 不正メールアドレスの拒否（@なし）',
    { ...validData, email: 'testexample.com' },
    400,
    '有効なメールアドレス'
  )
  await new Promise(resolve => setTimeout(resolve, 1000))

  // テスト4: 不正電話番号の拒否
  await testProduction(
    'テスト4: 不正電話番号の拒否（ひらがな）',
    { ...validData, phone: 'あいうえお' },
    400,
    '有効な電話番号'
  )
  await new Promise(resolve => setTimeout(resolve, 1000))

  // テスト5-8: レート制限テスト
  console.log('\n📊 レート制限テスト（5分間に3回まで）')

  const rateLimitData = {
    companyName: 'レート制限テスト株式会社',
    personName: 'テスト次郎',
    email: `ratelimit-${Date.now()}@example.com`,
    phone: '090-9876-5432',
  }

  await testProduction('   1回目（成功するはず）', rateLimitData, 200)
  await new Promise(resolve => setTimeout(resolve, 1000))

  rateLimitData.email = `ratelimit2-${Date.now()}@example.com`
  await testProduction('   2回目（成功するはず）', rateLimitData, 200)
  await new Promise(resolve => setTimeout(resolve, 1000))

  rateLimitData.email = `ratelimit3-${Date.now()}@example.com`
  await testProduction('   3回目（成功するはず）', rateLimitData, 200)
  await new Promise(resolve => setTimeout(resolve, 1000))

  rateLimitData.email = `ratelimit4-${Date.now()}@example.com`
  await testProduction('   4回目（ブロックされるはず）', rateLimitData, 429, 'リクエスト制限')

  // 結果サマリー
  console.log('\n' + '='.repeat(70))
  console.log('📋 テスト結果サマリー')
  console.log('='.repeat(70))

  const passedTests = results.filter(r => r.passed).length
  const totalTests = results.length

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
    if (!result.passed) {
      console.log(`   期待: ${result.expected}`)
      console.log(`   実際: ${result.actual}`)
    }
  })

  console.log('\n' + '='.repeat(70))
  console.log(`結果: ${passedTests}/${totalTests} テスト成功 (${Math.round(passedTests/totalTests*100)}%)`)
  console.log('='.repeat(70))

  if (passedTests === totalTests) {
    console.log('\n🎉 すべてのセキュリティテストに合格しました！')
    console.log('✅ デモ申し込みフォームは安全です。')
  } else {
    console.log('\n⚠️  一部のテストが失敗しました。')
    console.log('詳細を確認して修正が必要です。')
  }

  return passedTests === totalTests
}

runProductionTests()
  .then((success) => process.exit(success ? 0 : 1))
  .catch((error) => {
    console.error('\n❌ テスト実行エラー:', error)
    process.exit(1)
  })
