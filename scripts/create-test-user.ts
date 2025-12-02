import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function createTestUser() {
  const email = 'admin@a-kensetsu.com'
  const password = 'password123'
  const organizationId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' // A建設のID

  // ユーザー作成
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError) {
    console.error('認証エラー:', authError)
    return
  }

  console.log('✅ 認証ユーザー作成成功:', authData.user.id)

  // public.usersテーブルに登録
  const { error: userError } = await supabase.from('users').insert({
    id: authData.user.id,
    organization_id: organizationId,
    email: email,
    name: 'A建設管理者',
    role: 'admin',
  })

  if (userError) {
    console.error('ユーザー登録エラー:', userError)
    return
  }

  console.log('✅ ユーザー登録成功')
  console.log('------------------')
  console.log('Email:', email)
  console.log('Password:', password)
  console.log('Organization: A建設')
  console.log('Subdomain: http://a-kensetsu.localhost:3000')
  console.log('------------------')
}

createTestUser().catch(console.error)
