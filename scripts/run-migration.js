const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function runMigration() {
  const sql = `
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;
  `;

  console.log('マイグレーション実行中...');
  console.log(sql);

  // Supabase SDKでは直接SQLを実行できないため、rpc関数を使用
  // 代わりに、各カラムを個別に追加する方法を試す

  const { data, error } = await supabase.rpc('exec', {
    sql: sql
  });

  if (error) {
    console.error('エラー:', error);
    process.exit(1);
  }

  console.log('マイグレーション成功');
  console.log(data);
}

runMigration();
