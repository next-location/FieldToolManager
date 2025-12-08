import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createTestData() {
  console.log('🚀 テストデータ作成を開始します...\n')

  // 1. 組織を作成
  console.log('1️⃣ 組織を作成中...')
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      id: '10000000-0000-0000-0000-000000000001',
      name: 'A建設株式会社',
      postal_code: '100-0001',
      address: '東京都千代田区千代田1-1',
      phone: '03-1234-5678',
      fax: '03-1234-5679',
    })
    .select()
    .single()

  if (orgError) {
    console.error('❌ 組織作成エラー:', orgError)
    return
  }
  console.log('✅ 組織作成完了:', org.name)

  // 2. テストユーザーを作成
  console.log('\n2️⃣ テストユーザーを作成中...')

  const users = [
    {
      id: '10000000-0000-0000-0000-000000000001',
      email: 'admin@test.com',
      password: 'password123',
      name: '管理者太郎',
      role: 'admin',
    },
    {
      id: '10000000-0000-0000-0000-000000000002',
      email: 'manager@test.com',
      password: 'password123',
      name: 'マネージャー次郎',
      role: 'manager',
    },
    {
      id: '10000000-0000-0000-0000-000000000003',
      email: 'user@test.com',
      password: 'password123',
      name: 'ユーザー三郎',
      role: 'user',
    },
  ]

  for (const user of users) {
    // auth.usersにユーザー作成
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {},
    })

    if (authError) {
      console.error(`❌ ${user.name} の認証ユーザー作成エラー:`, authError)
      continue
    }

    // usersテーブルにユーザー情報を挿入
    const { error: userError } = await supabase.from('users').insert({
      id: authData.user.id,
      organization_id: org.id,
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: true,
    })

    if (userError) {
      console.error(`❌ ${user.name} のユーザー情報作成エラー:`, userError)
      continue
    }

    console.log(`✅ ${user.name} (${user.role}) 作成完了 - Email: ${user.email}`)
  }

  // 3. クライアント（発注者）を作成
  console.log('\n3️⃣ クライアントを作成中...')
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      organization_id: org.id,
      code: 'CLI-001',
      name: 'B商事株式会社',
      client_type: 'customer',
      address: '東京都港区赤坂1-1-1',
      phone: '03-9876-5432',
    })
    .select()
    .single()

  if (clientError) {
    console.error('❌ クライアント作成エラー:', clientError)
    return
  }
  console.log('✅ クライアント作成完了:', client.name)

  // 4. 現場を作成
  console.log('\n4️⃣ 現場を作成中...')
  const sites = [
    {
      name: '新宿オフィスビル建設現場',
      address: '東京都新宿区西新宿2-8-1',
      client_id: client.id,
    },
    {
      name: '渋谷マンション改修工事',
      address: '東京都渋谷区道玄坂1-2-3',
      client_id: client.id,
    },
  ]

  const createdSites = []
  for (const site of sites) {
    const { data, error } = await supabase
      .from('sites')
      .insert({
        organization_id: org.id,
        ...site,
      })
      .select()
      .single()

    if (error) {
      console.error(`❌ ${site.name} 作成エラー:`, error)
      continue
    }
    createdSites.push(data)
    console.log(`✅ 現場作成完了: ${data.name}`)
  }

  // 5. 作業報告書のカスタムフィールドを作成（現場共通）
  console.log('\n5️⃣ カスタムフィールドを作成中...')
  const customFields = [
    {
      organization_id: org.id,
      site_id: null, // 全現場共通
      field_key: 'temperature',
      field_label: '気温',
      field_type: 'number',
      display_order: 1,
      is_required: false,
      placeholder: '例: 25',
      help_text: '作業時の気温（℃）',
    },
    {
      organization_id: org.id,
      site_id: null,
      field_key: 'safety_check',
      field_label: '安全確認',
      field_type: 'checkbox',
      field_options: ['ヘルメット着用', '安全帯確認', '立入禁止区域設定'],
      display_order: 2,
      is_required: true,
    },
  ]

  for (const field of customFields) {
    const { error } = await supabase
      .from('work_report_custom_fields')
      .insert(field)

    if (error) {
      console.error(`❌ ${field.field_label} 作成エラー:`, error)
      continue
    }
    console.log(`✅ カスタムフィールド作成完了: ${field.field_label}`)
  }

  console.log('\n✅ テストデータ作成完了！\n')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('📝 テストアカウント情報')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n👨‍💼 管理者アカウント')
  console.log('Email: admin@test.com')
  console.log('Pass:  password123')
  console.log('Role:  admin (承認権限あり)')
  console.log('\n👷 マネージャーアカウント')
  console.log('Email: manager@test.com')
  console.log('Pass:  password123')
  console.log('Role:  manager (承認権限あり)')
  console.log('\n👤 ユーザーアカウント')
  console.log('Email: user@test.com')
  console.log('Pass:  password123')
  console.log('Role:  user (一般ユーザー)')
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏢 組織情報')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('名前:', org.name)
  console.log('現場数:', createdSites.length)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

createTestData().catch(console.error)
