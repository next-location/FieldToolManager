-- テストユーザーを作成するSQLスクリプト
-- パスワード: Test1234! のハッシュ値を使用

-- usersテーブルのrole制約を修正
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'staff', 'leader', 'super_admin'));

-- まず既存のユーザーを削除
DELETE FROM auth.identities WHERE user_id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

DELETE FROM users WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

DELETE FROM auth.users WHERE id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003'
);

-- 1. 管理者アカウント (admin@test.com)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'admin@test.com',
  crypt('Test1234!', gen_salt('bf')),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
);

-- auth.identities に挿入
INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000001', 'email', 'admin@test.com'),
  'email',
  NOW(),
  NOW(),
  NOW()
);

-- users テーブルに挿入
INSERT INTO users (
  id,
  email,
  name,
  role,
  organization_id,
  department,
  created_at
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'admin@test.com',
  '管理者 太郎',
  'admin',
  '00000000-0000-0000-0000-000000000001',
  '管理部',
  NOW()
);

-- 2. スタッフアカウント (staff@test.com)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'staff@test.com',
  crypt('Test1234!', gen_salt('bf')),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
);

INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000002', 'email', 'staff@test.com'),
  'email',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id,
  email,
  name,
  role,
  organization_id,
  department,
  created_at
)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'staff@test.com',
  '現場 次郎',
  'staff',
  '00000000-0000-0000-0000-000000000001',
  '作業部',
  NOW()
);

-- 3. リーダーアカウント (leader@test.com)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  confirmation_token,
  recovery_token,
  email_change_token_current,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000000',
  'leader@test.com',
  crypt('Test1234!', gen_salt('bf')),
  NOW(),
  '',
  '',
  '',
  '',
  '',
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  'authenticated',
  'authenticated'
);

INSERT INTO auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000003',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000003', 'email', 'leader@test.com'),
  'email',
  NOW(),
  NOW(),
  NOW()
);

INSERT INTO users (
  id,
  email,
  name,
  role,
  organization_id,
  department,
  created_at
)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  'leader@test.com',
  'リーダー 三郎',
  'leader',
  '00000000-0000-0000-0000-000000000001',
  '工事部',
  NOW()
);

-- 作成されたユーザーを表示
SELECT '管理者アカウント: admin@test.com / Test1234!' as admin_account;
SELECT 'スタッフアカウント: staff@test.com / Test1234!' as staff_account;
SELECT 'リーダーアカウント: leader@test.com / Test1234!' as leader_account;
