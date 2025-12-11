-- DXパッケージを持つ組織を作成

-- 組織作成
INSERT INTO organizations (id, name, subdomain, created_at)
VALUES ('00000000-0000-0000-0000-000000000002', 'テスト塗装株式会社', 'test-tosou', NOW())
ON CONFLICT (id) DO UPDATE SET name = 'テスト塗装株式会社', subdomain = 'test-tosou';

-- 現場を作成
INSERT INTO sites (id, organization_id, name, address, created_at)
VALUES
  ('30000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000002', '川崎工場塗装工事', '神奈川県川崎市川崎区1-1-1', NOW()),
  ('30000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000002', '横浜倉庫改修', '神奈川県横浜市港北区2-2-2', NOW())
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 管理者ユーザー (dx-admin@test.com / Test1234!)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data
) VALUES (
  '10000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'dx-admin@test.com',
  crypt('Test1234!', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '{"provider":"email","providers":["email"]}', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000101',
  '10000000-0000-0000-0000-000000000101',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000101', 'email', 'dx-admin@test.com'),
  'email', NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO users (id, organization_id, name, email, role, department, created_at)
VALUES (
  '10000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000002',
  '塗装 管理者',
  'dx-admin@test.com',
  'admin',
  '管理部',
  NOW()
) ON CONFLICT (id) DO UPDATE SET name = '塗装 管理者', department = '管理部';

-- スタッフユーザー (dx-staff@test.com / Test1234!)
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  created_at, updated_at, confirmation_token, raw_app_meta_data, raw_user_meta_data
) VALUES (
  '10000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'dx-staff@test.com',
  crypt('Test1234!', gen_salt('bf')),
  NOW(), NOW(), NOW(), '', '{"provider":"email","providers":["email"]}', '{}'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) VALUES (
  '10000000-0000-0000-0000-000000000102',
  '10000000-0000-0000-0000-000000000102',
  jsonb_build_object('sub', '10000000-0000-0000-0000-000000000102', 'email', 'dx-staff@test.com'),
  'email', NOW(), NOW(), NOW()
) ON CONFLICT DO NOTHING;

INSERT INTO users (id, organization_id, name, email, role, department, created_at)
VALUES (
  '10000000-0000-0000-0000-000000000102',
  '00000000-0000-0000-0000-000000000002',
  '塗装 スタッフ',
  'dx-staff@test.com',
  'staff',
  '作業部',
  NOW()
) ON CONFLICT (id) DO UPDATE SET name = '塗装 スタッフ', department = '作業部';

-- DXパッケージの契約を作成
INSERT INTO contracts (
  id,
  organization_id,
  contract_number,
  contract_type,
  plan,
  plan_type,
  status,
  start_date,
  user_limit,
  monthly_fee,
  base_monthly_fee,
  package_monthly_fee,
  auto_renew,
  has_asset_package,
  has_dx_efficiency_package,
  created_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000002',
  'CNT-TEST-002',
  'monthly',
  'premium',
  'standard',
  'active',
  '2025-01-01',
  30,
  18000,
  15000,
  3000,
  true,
  false,
  true,
  '10000000-0000-0000-0000-000000000101',
  NOW(),
  NOW()
);

-- 出退勤設定を作成
INSERT INTO organization_attendance_settings (
  organization_id,
  office_attendance_enabled,
  office_clock_methods,
  site_attendance_enabled,
  site_clock_methods,
  site_qr_type,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  true,
  '{"manual": true, "qr_scan": true, "qr_display": false}'::jsonb,
  true,
  '{"manual": false, "qr_scan": true, "qr_display": false}'::jsonb,
  'leader',
  NOW(),
  NOW()
) ON CONFLICT (organization_id) DO UPDATE SET
  office_clock_methods = '{"manual": true, "qr_scan": true, "qr_display": false}'::jsonb,
  site_clock_methods = '{"manual": false, "qr_scan": true, "qr_display": false}'::jsonb;

-- 確認
SELECT '=== 組織情報 ===' as info;
SELECT name, subdomain FROM organizations WHERE id = '00000000-0000-0000-0000-000000000002';

SELECT '=== ユーザー ===' as info;
SELECT email, role FROM users WHERE organization_id = '00000000-0000-0000-0000-000000000002';

SELECT '=== 契約情報 ===' as info;
SELECT
  contract_number,
  plan,
  has_asset_package,
  has_dx_efficiency_package,
  monthly_fee
FROM contracts
WHERE organization_id = '00000000-0000-0000-0000-000000000002';

SELECT '=== organization_features ビュー ===' as info;
SELECT
  organization_name,
  package_type,
  has_asset_package,
  has_dx_efficiency_package
FROM organization_features
WHERE organization_id = '00000000-0000-0000-0000-000000000002';

SELECT '=== ログイン情報 ===' as info;
SELECT 'URL: http://test-tosou.localhost:3000' as login_url;
SELECT 'Admin: dx-admin@test.com / Test1234!' as admin_account;
SELECT 'Staff: dx-staff@test.com / Test1234!' as staff_account;
