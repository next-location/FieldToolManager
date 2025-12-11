import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function createDxAdminUser() {
  console.log('Creating DX Admin user...')

  // 1. Supabase Auth APIでユーザーを作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'dx-admin@test.com',
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: {}
  })

  if (authError) {
    console.error('Auth error:', authError)
    process.exit(1)
  }

  console.log('✅ Auth user created:', authData.user.id)

  // 2. usersテーブルにレコードを作成
  const { error: usersError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      organization_id: '00000000-0000-0000-0000-000000000002',
      name: '塗装 管理者',
      email: 'dx-admin@test.com',
      role: 'admin',
      department: '管理部'
    })

  if (usersError) {
    console.error('Users table error:', usersError)
    process.exit(1)
  }

  console.log('✅ Users record created')

  // 3. dx-staff用も作成
  const { data: staffAuthData, error: staffAuthError } = await supabase.auth.admin.createUser({
    email: 'dx-staff@test.com',
    password: 'Test1234!',
    email_confirm: true,
    user_metadata: {}
  })

  if (staffAuthError) {
    console.error('Staff auth error:', staffAuthError)
    process.exit(1)
  }

  console.log('✅ Staff auth user created:', staffAuthData.user.id)

  const { error: staffUsersError } = await supabase
    .from('users')
    .insert({
      id: staffAuthData.user.id,
      organization_id: '00000000-0000-0000-0000-000000000002',
      name: '塗装 スタッフ',
      email: 'dx-staff@test.com',
      role: 'user',
      department: '作業部'
    })

  if (staffUsersError) {
    console.error('Staff users table error:', staffUsersError)
    process.exit(1)
  }

  console.log('✅ Staff users record created')
  console.log('\n🎉 DX organization users created successfully!')
  console.log('Admin: dx-admin@test.com / Test1234!')
  console.log('Staff: dx-staff@test.com / Test1234!')
}

createDxAdminUser()
