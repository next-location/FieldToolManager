#!/bin/bash

# テストユーザーを作成するスクリプト

echo "Creating test user..."

# Supabase CLIを使用してSQLを実行
npx supabase db execute --file - <<EOF
-- テスト組織が存在しない場合は作成
INSERT INTO organizations (id, name, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'テスト建設株式会社', NOW())
ON CONFLICT (id) DO NOTHING;

-- auth.usersに既にユーザーが存在するか確認し、usersテーブルに追加
DO \$\$
DECLARE
  auth_user_id UUID;
BEGIN
  -- admin@test.comのauth.users IDを取得
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'admin@test.com';

  IF auth_user_id IS NOT NULL THEN
    -- usersテーブルに存在しない場合のみ追加
    INSERT INTO users (id, organization_id, email, name, role)
    VALUES (
      auth_user_id,
      '00000000-0000-0000-0000-000000000001',
      'admin@test.com',
      '管理者',
      'admin'
    )
    ON CONFLICT (id) DO NOTHING;

    RAISE NOTICE 'User admin@test.com linked to organization';
  ELSE
    RAISE NOTICE 'Auth user admin@test.com not found. Please create it in Supabase Studio first.';
  END IF;
END \$\$;
EOF

echo "Done!"
