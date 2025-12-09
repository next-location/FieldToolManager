/**
 * 帳票管理機能の統合テスト用データ作成スクリプト
 *
 * 作成されるデータ:
 * - 取引先マスタ: 5社（元請け3社、下請け2社）
 * - 工事マスタ: 3件（進行中2件、完了1件）
 * - 見積書: 10件（各ステータス含む）
 * - 請求書: 8件（一部入金・全額入金・未入金含む）
 * - 発注書: 6件（一部納品・全額納品・未納品含む）
 * - 入出金記録: 10件（請求書・発注書に紐付け）
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ORG_ID = '00000000-0000-0000-0000-000000000001'
const USER_ID = '482dfd07-c261-49d9-8736-d79f45da2767' // auth.usersのadmin@test.comのID

async function createTestData() {
  console.log('🚀 帳票管理テストデータ作成開始...\n')

  try {
    // 0. organizationとユーザー確認・作成
    console.log('👤 organizationとユーザー確認中...')
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('id', ORG_ID)
      .single()

    if (!existingOrg) {
      console.log('organizationが存在しないため作成します...')
      const { error: orgError } = await supabase.from('organizations').insert({
        id: ORG_ID,
        name: 'テスト建設株式会社',
        plan: 'standard',
        is_active: true,
        address: '東京都渋谷区渋谷1-1-1',
        phone: '03-0000-0000',
        tax_registration_number: 'T0000000000000',
        is_qualified_invoice_issuer: true
      })
      if (orgError) throw orgError
    }

    const userId = USER_ID
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (!existingUser) {
      console.log('ユーザーが存在しないため作成します...')
      // まずauth.usersに登録
      const { error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@test.com',
        password: 'password',
        email_confirm: true,
        user_metadata: {
          name: '管理者'
        }
      })

      // usersテーブルに直接挿入
      const { error: userError } = await supabase.from('users').upsert({
        id: userId,
        email: 'admin@test.com',
        name: '管理者',
        role: 'admin',
        organization_id: ORG_ID,
        is_active: true
      })
      if (userError) throw userError
    }
    console.log('✅ organization・ユーザー確認完了\n')

    // 1. 取引先マスタ作成
    console.log('📋 取引先マスタ作成中...')
    const clients = [
      {
        id: '10000000-0000-0000-0001-000000000001',
        client_code: 'CLI-001',
        name: '株式会社山田建設',
        client_type: 'customer',
        postal_code: '100-0001',
        address: '東京都千代田区千代田1-1-1',
        phone: '03-1111-1111',
        email: 'yamada@example.com',
        contact_person: '山田太郎',
        payment_terms: '月末締め翌月末払い',
        payment_due_days: 30,
        is_tax_exempt: false,
        tax_registration_number: 'T1234567890123',
        organization_id: ORG_ID
      },
      {
        id: '10000000-0000-0000-0001-000000000002',
        client_code: 'CLI-002',
        name: '佐藤工業株式会社',
        client_type: 'customer',
        postal_code: '100-0002',
        address: '東京都千代田区千代田2-2-2',
        phone: '03-2222-2222',
        email: 'sato@example.com',
        contact_person: '佐藤次郎',
        payment_terms: '月末締め翌々月10日払い',
        payment_due_days: 40,
        is_tax_exempt: false,
        tax_registration_number: 'T2345678901234',
        organization_id: ORG_ID
      },
      {
        id: '10000000-0000-0000-0001-000000000003',
        client_code: 'CLI-003',
        name: '鈴木開発株式会社',
        client_type: 'customer',
        postal_code: '100-0003',
        address: '東京都千代田区千代田3-3-3',
        phone: '03-3333-3333',
        email: 'suzuki@example.com',
        contact_person: '鈴木三郎',
        payment_terms: '15日締め翌月末払い',
        payment_due_days: 45,
        is_tax_exempt: false,
        tax_registration_number: 'T3456789012345',
        organization_id: ORG_ID
      },
      {
        id: '10000000-0000-0000-0001-000000000004',
        client_code: 'SUP-001',
        name: '田中資材株式会社',
        client_type: 'supplier',
        postal_code: '100-0004',
        address: '東京都千代田区千代田4-4-4',
        phone: '03-4444-4444',
        email: 'tanaka@example.com',
        contact_person: '田中四郎',
        payment_terms: '月末締め翌月末払い',
        payment_due_days: 30,
        is_tax_exempt: false,
        tax_registration_number: 'T4567890123456',
        organization_id: ORG_ID
      },
      {
        id: '10000000-0000-0000-0001-000000000005',
        client_code: 'SUP-002',
        name: '高橋電設株式会社',
        client_type: 'supplier',
        postal_code: '100-0005',
        address: '東京都千代田区千代田5-5-5',
        phone: '03-5555-5555',
        email: 'takahashi@example.com',
        contact_person: '高橋五郎',
        payment_terms: '月末締め翌月末払い',
        payment_due_days: 30,
        is_tax_exempt: false,
        tax_registration_number: 'T5678901234567',
        organization_id: ORG_ID
      }
    ]

    for (const client of clients) {
      const { error } = await supabase.from('clients').upsert(client)
      if (error) throw error
    }
    console.log(`✅ 取引先 ${clients.length}社 作成完了\n`)

    // 2. 工事マスタ作成
    console.log('🏗️  工事マスタ作成中...')
    const projects = [
      {
        id: '20000000-0000-0000-0001-000000000001',
        project_code: 'PRJ-2024-001',
        project_name: '〇〇ビル新築工事',
        client_id: clients[0].id,
        start_date: '2024-04-01',
        end_date: '2025-03-31',
        budget_amount: 50000000,
        status: 'in_progress',
        organization_id: ORG_ID
      },
      {
        id: '20000000-0000-0000-0001-000000000002',
        project_code: 'PRJ-2024-002',
        project_name: '△△マンション改修工事',
        client_id: clients[1].id,
        start_date: '2024-06-01',
        end_date: '2025-05-31',
        budget_amount: 30000000,
        status: 'in_progress',
        organization_id: ORG_ID
      },
      {
        id: '20000000-0000-0000-0001-000000000003',
        project_code: 'PRJ-2023-005',
        project_name: '××店舗内装工事',
        client_id: clients[2].id,
        start_date: '2023-10-01',
        end_date: '2024-03-31',
        budget_amount: 15000000,
        status: 'completed',
        organization_id: ORG_ID
      }
    ]

    for (const project of projects) {
      const { error } = await supabase.from('projects').upsert(project)
      if (error) throw error
    }
    console.log(`✅ 工事 ${projects.length}件 作成完了\n`)

    // 3. 見積書作成（10件）
    console.log('📝 見積書作成中...')
    const today = new Date()
    const estimates = [
      // 下書き 2件
      {
        id: '30000000-0000-0000-0001-000000000001',
        estimate_number: 'EST-2024-001',
        client_id: clients[0].id,
        project_id: projects[0].id,
        estimate_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '〇〇ビル新築工事 見積書',
        subtotal: 20000000,
        tax_amount: 2000000,
        total_amount: 22000000,
        status: 'draft',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '30000000-0000-0000-0001-000000000002',
        estimate_number: 'EST-2024-002',
        client_id: clients[1].id,
        project_id: projects[1].id,
        estimate_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 35 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '△△マンション改修工事 見積書',
        subtotal: 15000000,
        tax_amount: 1500000,
        total_amount: 16500000,
        status: 'draft',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 送付済み 3件
      {
        id: '30000000-0000-0000-0001-000000000003',
        estimate_number: 'EST-2024-003',
        client_id: clients[0].id,
        project_id: projects[0].id,
        estimate_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '追加工事 見積書',
        subtotal: 5000000,
        tax_amount: 500000,
        total_amount: 5500000,
        status: 'sent',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '30000000-0000-0000-0001-000000000004',
        estimate_number: 'EST-2024-004',
        client_id: clients[1].id,
        estimate_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '設備工事 見積書',
        subtotal: 8000000,
        tax_amount: 800000,
        total_amount: 8800000,
        status: 'sent',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '30000000-0000-0000-0001-000000000005',
        estimate_number: 'EST-2024-005',
        client_id: clients[2].id,
        project_id: projects[2].id,
        estimate_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '内装工事 見積書',
        subtotal: 6000000,
        tax_amount: 600000,
        total_amount: 6600000,
        status: 'sent',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 承認済み 3件
      {
        id: '30000000-0000-0000-0001-000000000006',
        estimate_number: 'EST-2024-006',
        client_id: clients[0].id,
        project_id: projects[0].id,
        estimate_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '基礎工事 見積書',
        subtotal: 5000000,
        tax_amount: 500000,
        total_amount: 5500000,
        status: 'accepted',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '30000000-0000-0000-0001-000000000007',
        estimate_number: 'EST-2024-007',
        client_id: clients[1].id,
        project_id: projects[1].id,
        estimate_date: new Date(today.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '外壁塗装 見積書',
        subtotal: 3000000,
        tax_amount: 300000,
        total_amount: 3300000,
        status: 'accepted',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '30000000-0000-0000-0001-000000000008',
        estimate_number: 'EST-2024-008',
        client_id: clients[2].id,
        project_id: projects[2].id,
        estimate_date: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '電気設備 見積書',
        subtotal: 1500000,
        tax_amount: 150000,
        total_amount: 1650000,
        status: 'accepted',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 却下 1件
      {
        id: '30000000-0000-0000-0001-000000000009',
        estimate_number: 'EST-2024-009',
        client_id: clients[0].id,
        estimate_date: new Date(today.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: 'オプション工事 見積書',
        subtotal: 2000000,
        tax_amount: 200000,
        total_amount: 2200000,
        status: 'rejected',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 期限切れ 1件
      {
        id: '30000000-0000-0000-0001-000000000010',
        estimate_number: 'EST-2024-010',
        client_id: clients[1].id,
        estimate_date: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        valid_until: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '追加提案 見積書',
        subtotal: 10000000,
        tax_amount: 1000000,
        total_amount: 11000000,
        status: 'expired',
        organization_id: ORG_ID,
        created_by: USER_ID
      }
    ]

    for (const estimate of estimates) {
      const { error } = await supabase.from('estimates').upsert(estimate)
      if (error) throw error

      // 各見積書に明細を追加（3-5件）
      const itemCount = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < itemCount; i++) {
        const { error: itemError } = await supabase.from('estimate_items').insert({
          estimate_id: estimate.id,
          item_type: ['material', 'labor', 'subcontract'][i % 3],
          item_name: `工事項目 ${i + 1}`,
          description: `工事内容の説明 ${i + 1}`,
          quantity: 10 + i * 5,
          unit: '式',
          unit_price: 100000 + i * 50000,
          tax_rate: 10,
          amount: (10 + i * 5) * (100000 + i * 50000),
          display_order: i
        })
        if (itemError) throw itemError
      }
    }
    console.log(`✅ 見積書 ${estimates.length}件 作成完了\n`)

    // 4. 請求書作成（8件）
    console.log('💰 請求書作成中...')
    const invoices = [
      // 未入金 2件（期限前1件、期限後1件）
      {
        id: '40000000-0000-0000-0001-000000000001',
        invoice_number: 'INV-2024-001',
        client_id: clients[0].id,
        project_id: projects[0].id,
        estimate_id: estimates[5].id, // 承認済み見積書
        invoice_date: new Date(today.getTime() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '基礎工事 請求書',
        subtotal: 5000000,
        tax_amount: 500000,
        total_amount: 5500000,
        paid_amount: 0,
        status: 'sent',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '40000000-0000-0000-0001-000000000002',
        invoice_number: 'INV-2024-002',
        client_id: clients[1].id,
        project_id: projects[1].id,
        estimate_id: estimates[6].id,
        invoice_date: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '外壁塗装 請求書',
        subtotal: 3000000,
        tax_amount: 300000,
        total_amount: 3300000,
        paid_amount: 0,
        status: 'sent',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 一部入金 3件
      {
        id: '40000000-0000-0000-0001-000000000003',
        invoice_number: 'INV-2024-003',
        client_id: clients[0].id,
        project_id: projects[0].id,
        invoice_date: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '追加工事 請求書',
        subtotal: 2000000,
        tax_amount: 200000,
        total_amount: 2200000,
        paid_amount: 1000000,
        status: 'sent',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '40000000-0000-0000-0001-000000000004',
        invoice_number: 'INV-2024-004',
        client_id: clients[2].id,
        project_id: projects[2].id,
        estimate_id: estimates[7].id,
        invoice_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '電気設備 請求書',
        subtotal: 1500000,
        tax_amount: 150000,
        total_amount: 1650000,
        paid_amount: 500000,
        status: 'sent',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '40000000-0000-0000-0001-000000000005',
        invoice_number: 'INV-2024-005',
        client_id: clients[1].id,
        project_id: projects[1].id,
        invoice_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '設備工事 請求書',
        subtotal: 2500000,
        tax_amount: 250000,
        total_amount: 2750000,
        paid_amount: 2000000,
        status: 'sent',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 全額入金済み 3件
      {
        id: '40000000-0000-0000-0001-000000000006',
        invoice_number: 'INV-2024-006',
        client_id: clients[0].id,
        project_id: projects[0].id,
        invoice_date: new Date(today.getTime() - 70 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '〇〇ビル新築工事 第1回目 請求書',
        subtotal: 10000000,
        tax_amount: 1000000,
        total_amount: 11000000,
        paid_amount: 11000000,
        status: 'paid',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '40000000-0000-0000-0001-000000000007',
        invoice_number: 'INV-2024-007',
        client_id: clients[2].id,
        project_id: projects[2].id,
        invoice_date: new Date(today.getTime() - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '××店舗内装工事 最終請求書',
        subtotal: 8000000,
        tax_amount: 800000,
        total_amount: 8800000,
        paid_amount: 8800000,
        status: 'paid',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '40000000-0000-0000-0001-000000000008',
        invoice_number: 'INV-2024-008',
        client_id: clients[1].id,
        project_id: projects[1].id,
        invoice_date: new Date(today.getTime() - 65 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        due_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: '△△マンション改修工事 第1回目 請求書',
        subtotal: 12000000,
        tax_amount: 1200000,
        total_amount: 13200000,
        paid_amount: 13200000,
        status: 'paid',
        is_qualified_invoice: true,
        invoice_registration_number: 'T1234567890123',
        organization_id: ORG_ID,
        created_by: USER_ID
      }
    ]

    for (const invoice of invoices) {
      const { error } = await supabase.from('billing_invoices').upsert(invoice)
      if (error) throw error

      // 各請求書に明細を追加（3-5件）
      const itemCount = 3 + Math.floor(Math.random() * 3)
      for (let i = 0; i < itemCount; i++) {
        const { error: itemError } = await supabase.from('billing_invoice_items').insert({
          invoice_id: invoice.id,
          item_type: ['material', 'labor', 'subcontract'][i % 3],
          item_name: `請求項目 ${i + 1}`,
          description: `工事内容の説明 ${i + 1}`,
          quantity: 10 + i * 5,
          unit: '式',
          unit_price: Math.floor(invoice.subtotal / itemCount / (10 + i * 5)),
          tax_rate: 10,
          amount: Math.floor(invoice.subtotal / itemCount),
          display_order: i
        })
        if (itemError) throw itemError
      }
    }
    console.log(`✅ 請求書 ${invoices.length}件 作成完了\n`)

    // 5. 発注書作成（6件）
    console.log('📦 発注書作成中...')
    const purchaseOrders = [
      // 未納品 2件
      {
        id: '50000000-0000-0000-0001-000000000001',
        order_number: 'PO-2024-001',
        supplier_id: clients[3].id, // 田中資材
        project_id: projects[0].id,
        order_date: new Date(today.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_date: new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 2000000,
        tax_amount: 200000,
        total_amount: 2200000,
        status: 'ordered',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '50000000-0000-0000-0001-000000000002',
        order_number: 'PO-2024-002',
        supplier_id: clients[4].id, // 高橋電設
        project_id: projects[1].id,
        order_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_date: new Date(today.getTime() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 1500000,
        tax_amount: 150000,
        total_amount: 1650000,
        status: 'ordered',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 一部納品 2件
      {
        id: '50000000-0000-0000-0001-000000000003',
        order_number: 'PO-2024-003',
        supplier_id: clients[3].id,
        project_id: projects[0].id,
        order_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_date: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 1000000,
        tax_amount: 100000,
        total_amount: 1100000,
        status: 'partially_received',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '50000000-0000-0000-0001-000000000004',
        order_number: 'PO-2024-004',
        supplier_id: clients[4].id,
        project_id: projects[1].id,
        order_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_date: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 800000,
        tax_amount: 80000,
        total_amount: 880000,
        status: 'partially_received',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      // 納品済み 2件
      {
        id: '50000000-0000-0000-0001-000000000005',
        order_number: 'PO-2024-005',
        supplier_id: clients[3].id,
        project_id: projects[2].id,
        order_date: new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_date: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 3000000,
        tax_amount: 300000,
        total_amount: 3300000,
        status: 'received',
        organization_id: ORG_ID,
        created_by: USER_ID
      },
      {
        id: '50000000-0000-0000-0001-000000000006',
        order_number: 'PO-2024-006',
        supplier_id: clients[4].id,
        project_id: projects[2].id,
        order_date: new Date(today.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        delivery_date: new Date(today.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subtotal: 2500000,
        tax_amount: 250000,
        total_amount: 2750000,
        status: 'received',
        organization_id: ORG_ID,
        created_by: USER_ID
      }
    ]

    for (const po of purchaseOrders) {
      const { error } = await supabase.from('purchase_orders').upsert(po)
      if (error) throw error

      // 各発注書に明細を追加（2-4件)
      const itemCount = 2 + Math.floor(Math.random() * 3)
      for (let i = 0; i < itemCount; i++) {
        const { error: itemError } = await supabase.from('purchase_order_items').insert({
          purchase_order_id: po.id,
          item_type: ['material', 'labor', 'subcontract'][i % 3],
          item_name: `発注項目 ${i + 1}`,
          description: `発注内容の説明 ${i + 1}`,
          quantity: 10 + i * 5,
          unit: i === 0 ? '式' : i === 1 ? 'm' : '個',
          unit_price: Math.floor(po.subtotal / itemCount / (10 + i * 5)),
          tax_rate: 10,
          amount: Math.floor(po.subtotal / itemCount),
          display_order: i
        })
        if (itemError) throw itemError
      }
    }
    console.log(`✅ 発注書 ${purchaseOrders.length}件 作成完了\n`)

    console.log('✨ テストデータ作成完了！\n')
    console.log('📊 作成されたデータ:')
    console.log(`  - 取引先: ${clients.length}社`)
    console.log(`  - 工事: ${projects.length}件`)
    console.log(`  - 見積書: ${estimates.length}件`)
    console.log(`  - 請求書: ${invoices.length}件`)
    console.log(`  - 発注書: ${purchaseOrders.length}件`)
    console.log('\n💡 テストデータの内容:')
    console.log('  見積書: 下書き2件、送付済み3件、承認済み3件、却下1件、期限切れ1件')
    console.log('  請求書: 未入金2件(期限前1・期限後1)、一部入金3件、全額入金済み3件')
    console.log('  発注書: 未納品2件、一部納品2件、全額納品済み2件')
    console.log('\n📝 次のステップ: http://localhost:3000 にログインしてテストしてください')
    console.log('   ログイン情報: admin@test.com / password')

  } catch (error) {
    console.error('❌ エラーが発生しました:', error)
    process.exit(1)
  }
}

createTestData()
