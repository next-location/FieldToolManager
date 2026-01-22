/**
 * テスト株式会社（u44c5tks）の見積書ダミーデータ60件作成スクリプト
 *
 * 実行方法:
 * npx tsx scripts/create-test-estimates.ts
 */

import { createClient } from '@supabase/supabase-js'

// 環境変数から取得
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const TEST_SUBDOMAIN = 'u44c5tks'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ 環境変数が設定されていません')
  console.error('NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function main() {
  console.log('🚀 テストデータ作成開始...')

  // 1. テスト株式会社の情報を取得
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, subdomain')
    .eq('subdomain', TEST_SUBDOMAIN)
    .single()

  if (orgError || !org) {
    console.error('❌ テスト株式会社が見つかりません:', orgError)
    return
  }

  console.log('✅ 組織情報:', org)

  // 2. ユーザーを取得
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', org.id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (userError || !user) {
    console.error('❌ ユーザーが見つかりません:', userError)
    return
  }

  console.log('✅ ユーザー情報:', user)

  // 3. 取引先を取得または作成
  let { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('organization_id', org.id)
    .is('deleted_at', null)
    .limit(1)
    .single()

  if (!client) {
    console.log('📝 取引先を作成中...')
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({
        organization_id: org.id,
        name: 'テスト取引先',
        client_code: 'TEST001',
        client_type: 'customer',
        is_active: true
      })
      .select()
      .single()

    if (clientError || !newClient) {
      console.error('❌ 取引先の作成に失敗:', clientError)
      return
    }
    client = newClient
  }

  console.log('✅ 取引先情報:', client)

  // 4. 案件を取得または作成
  let { data: project } = await supabase
    .from('projects')
    .select('id, project_name')
    .eq('organization_id', org.id)
    .limit(1)
    .single()

  if (!project) {
    console.log('📝 案件を作成中...')
    const { data: newProject, error: projectError } = await supabase
      .from('projects')
      .insert({
        organization_id: org.id,
        project_code: 'PRJ001',
        project_name: 'テスト案件',
        client_id: client.id,
        status: 'in_progress',
        start_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single()

    if (projectError || !newProject) {
      console.error('❌ 案件の作成に失敗:', projectError)
      return
    }
    project = newProject
  }

  console.log('✅ 案件情報:', project)

  // 5. 見積書60件を作成
  console.log('📝 見積書60件を作成中...')

  const today = new Date()
  const estimates = []

  for (let i = 1; i <= 60; i++) {
    const estimateDate = new Date(today)
    estimateDate.setDate(estimateDate.getDate() - i)

    const validUntil = new Date(today)
    validUntil.setDate(validUntil.getDate() + (30 - i))

    const baseAmount = 1000000 + (i * 10000)
    const taxAmount = Math.floor(baseAmount * 0.1)

    const statuses = ['draft', 'submitted', 'sent', 'accepted', 'rejected']
    const status = statuses[i % 5]

    estimates.push({
      organization_id: org.id,
      estimate_number: `EST-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(4, '0')}`,
      client_id: client.id,
      project_id: project.id,
      estimate_date: estimateDate.toISOString().split('T')[0],
      valid_until: validUntil.toISOString().split('T')[0],
      total_amount: baseAmount + taxAmount,
      tax_amount: taxAmount,
      subtotal: baseAmount,
      status: status,
      created_by: user.id,
      subject: `テスト見積 ${i}件目`,
      notes: 'これはテスト用のダミーデータです'
    })
  }

  // バッチで挿入
  const { data: insertedEstimates, error: estimateError } = await supabase
    .from('estimates')
    .insert(estimates)
    .select('id')

  if (estimateError) {
    console.error('❌ 見積書の作成に失敗:', estimateError)
    return
  }

  console.log(`✅ 見積書${insertedEstimates?.length}件を作成しました`)

  // 6. 各見積書に明細を1件追加
  console.log('📝 見積明細を作成中...')

  const estimateItems = insertedEstimates?.map((estimate, index) => {
    const i = index + 1
    const amount = 1000000 + (i * 10000)

    return {
      estimate_id: estimate.id,
      item_type: 'construction',
      description: `テスト工事項目 ${i}`,
      quantity: 1,
      unit: '式',
      unit_price: amount,
      amount: amount
    }
  })

  const { error: itemsError } = await supabase
    .from('estimate_items')
    .insert(estimateItems || [])

  if (itemsError) {
    console.error('❌ 見積明細の作成に失敗:', itemsError)
    return
  }

  console.log(`✅ 見積明細${estimateItems?.length}件を作成しました`)

  console.log('')
  console.log('🎉 テストデータの作成が完了しました！')
  console.log(`📊 見積書: ${insertedEstimates?.length}件`)
  console.log(`📋 見積明細: ${estimateItems?.length}件`)
  console.log(`🏢 組織: ${org.name} (${org.subdomain})`)
  console.log(`👤 作成者: ${user.name} (${user.email})`)
  console.log(`🏭 取引先: ${client.name}`)
  console.log(`📁 案件: ${project.project_name}`)
}

main()
  .then(() => {
    console.log('✅ スクリプト実行完了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  })
