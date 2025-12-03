/**
 * テストユーザー作成スクリプト
 * Supabase Admin APIを使用してユーザーを作成します
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseServiceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createTestUsers() {
  console.log('🚀 テストユーザーを作成します...\n')

  // 組織を作成
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .upsert({
      id: '00000000-0000-0000-0000-000000000001',
      name: 'テスト建設株式会社',
    })
    .select()
    .single()

  if (orgError && orgError.code !== '23505') {
    console.error('❌ 組織の作成に失敗:', orgError)
  } else {
    console.log('✅ 組織を作成しました: テスト建設株式会社')
  }

  // 管理者ユーザーを作成
  const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
    email: 'admin@test.com',
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: {
      name: '管理者 太郎',
    },
  })

  if (adminAuthError) {
    console.error('❌ 管理者ユーザーの作成に失敗:', adminAuthError.message)
  } else {
    console.log('✅ 管理者ユーザーを作成しました')
    console.log('   メール: admin@test.com')
    console.log('   パスワード: Test1234!')
    console.log('   ID:', adminAuth.user.id)

    // usersテーブルにレコードを追加
    const { error: adminUserError } = await supabase.from('users').upsert({
      id: adminAuth.user.id,
      organization_id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@test.com',
      name: '管理者 太郎',
      role: 'admin',
      department: '管理部',
    })

    if (adminUserError) {
      console.error('❌ usersテーブルへの追加に失敗:', adminUserError.message)
    }
  }

  // スタッフユーザーを作成
  const { data: staffAuth, error: staffAuthError } = await supabase.auth.admin.createUser({
    email: 'staff@test.com',
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: {
      name: 'スタッフ 花子',
    },
  })

  if (staffAuthError) {
    console.error('❌ スタッフユーザーの作成に失敗:', staffAuthError.message)
  } else {
    console.log('\n✅ スタッフユーザーを作成しました')
    console.log('   メール: staff@test.com')
    console.log('   パスワード: Test1234!')
    console.log('   ID:', staffAuth.user.id)

    // usersテーブルにレコードを追加
    const { error: staffUserError } = await supabase.from('users').upsert({
      id: staffAuth.user.id,
      organization_id: '00000000-0000-0000-0000-000000000001',
      email: 'staff@test.com',
      name: 'スタッフ 花子',
      role: 'user',
      department: '工事部',
    })

    if (staffUserError) {
      console.error('❌ usersテーブルへの追加に失敗:', staffUserError.message)
    }
  }

  console.log('\n🎉 テストユーザーの作成が完了しました！')
  console.log('\n📝 ログイン情報:')
  console.log('   管理者: admin@test.com / Test1234!')
  console.log('   スタッフ: staff@test.com / Test1234!')
}

createTestUsers().catch((error) => {
  console.error('❌ エラーが発生しました:', error)
  process.exit(1)
})
