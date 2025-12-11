import bcrypt from 'bcrypt';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// .env.localを読み込む
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function createSuperAdmin() {
  const password = 'SuperAdmin123!';
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('super_admins')
    .insert({
      email: 'superadmin@fieldtool.com',
      name: 'スーパー管理者',
      password_hash: passwordHash,
      permission_level: 'admin',
      role: 'owner', // デフォルトでownerに設定
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ スーパーアドミン作成完了');
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 ログイン情報');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Email:', data.email);
    console.log('Password:', password);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

createSuperAdmin();
