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

  // 1. 既存の組織を取得
  console.log('1️⃣ 組織を取得中...')
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select()
    .limit(1)

  if (orgError || !orgs || orgs.length === 0) {
    console.error('❌ 組織取得エラー:', orgError)
    return
  }
  const org = orgs[0]
  console.log('✅ 組織取得完了:', org.name)

  // 2. 既存のユーザーを確認
  console.log('\n2️⃣ ユーザーを確認中...')
  const { data: existingUsers } = await supabase
    .from('users')
    .select('*')
    .eq('organization_id', org.id)

  console.log(`✅ ${existingUsers?.length || 0} 人のユーザーが存在します`)

  // 3. クライアント（発注者）を作成または取得
  console.log('\n3️⃣ クライアントを取得中...')
  let { data: client } = await supabase
    .from('clients')
    .select()
    .eq('organization_id', org.id)
    .eq('client_code', 'CLI-001')
    .single()

  if (!client) {
    console.log('クライアントが存在しないため作成します...')
    const { data, error: clientError } = await supabase
      .from('clients')
      .insert({
        organization_id: org.id,
        client_code: 'CLI-001',
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
    client = data
    console.log('✅ クライアント作成完了:', client.name)
  } else {
    console.log('✅ クライアント取得完了:', client.name)
  }

  // 4. 現場を作成
  console.log('\n4️⃣ 現場を作成中...')
  const sites = [
    {
      name: '新宿オフィスビル建設現場',
      address: '東京都新宿区西新宿2-8-1',
    },
    {
      name: '渋谷マンション改修工事',
      address: '東京都渋谷区道玄坂1-2-3',
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
  console.log('Pass:  Test1234!')
  console.log('Role:  admin (承認権限あり)')
  console.log('\n👷 リーダーアカウント')
  console.log('Email: leader@test.com')
  console.log('Pass:  Test1234!')
  console.log('Role:  leader')
  console.log('\n👤 スタッフアカウント')
  console.log('Email: staff@test.com')
  console.log('Pass:  Test1234!')
  console.log('Role:  staff (一般ユーザー)')
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🏢 組織情報')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('名前:', org.name)
  console.log('現場数:', createdSites.length)
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
}

createTestData().catch(console.error)
