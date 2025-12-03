-- 開発環境用のテストデータ投入スクリプト
-- このスクリプトは何度実行しても安全（既存データをクリアしてから投入）

-- ========================================
-- 1. 既存のテストデータをクリア
-- ========================================
DELETE FROM consumable_movements WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM consumable_inventory WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM movements WHERE tool_item_id IN (SELECT id FROM tool_items WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社'));
DELETE FROM tool_items WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM tools WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM sites WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM warehouse_locations WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM users WHERE organization_id IN (SELECT id FROM organizations WHERE name = 'テスト建設株式会社');
DELETE FROM organizations WHERE name = 'テスト建設株式会社';

-- ========================================
-- 2. 組織を作成
-- ========================================
INSERT INTO organizations (id, name, setup_completed_at, created_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'テスト建設株式会社', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. ユーザーを作成（Supabase Auth経由）
-- ========================================
-- 管理者ユーザー
-- メール: admin@test.com
-- パスワード: Test1234!
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'admin@test.com',
  '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG1vRCaP4wa', -- Test1234!
  NOW(),
  NOW(),
  NOW(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- スタッフユーザー
-- メール: staff@test.com
-- パスワード: Test1234!
INSERT INTO auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_app_meta_data,
  raw_user_meta_data
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'staff@test.com',
  '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LbE14qsMmKGhM1A8W9iqaG1vRCaP4wa', -- Test1234!
  NOW(),
  NOW(),
  NOW(),
  '',
  '{"provider":"email","providers":["email"]}',
  '{}'
) ON CONFLICT (id) DO NOTHING;

-- usersテーブルにユーザー情報を登録
INSERT INTO users (id, organization_id, name, email, role, department, created_at)
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '管理者 太郎', 'admin@test.com', 'admin', '管理部', NOW()),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'スタッフ 花子', 'staff@test.com', 'staff', '工事部', NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 4. 倉庫位置を作成
-- ========================================
INSERT INTO warehouse_locations (id, organization_id, code, display_name, created_at)
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'A-01', '第1倉庫 A棟 1階', NOW()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'A-02', '第1倉庫 A棟 2階', NOW()),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'B-01', '第2倉庫 B棟 1階', NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 5. 現場を作成
-- ========================================
INSERT INTO sites (id, organization_id, name, address, status, created_at)
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '新宿ビル改修工事', '東京都新宿区西新宿1-1-1', 'active', NOW()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '渋谷マンション建設', '東京都渋谷区道玄坂2-2-2', 'active', NOW()),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '横浜駅前開発', '神奈川県横浜市西区高島3-3-3', 'active', NOW()),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '品川オフィス改装', '東京都港区港南4-4-4', 'completed', NOW()),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '川崎工場塗装', '神奈川県川崎市川崎区5-5-5', 'active', NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 6. 道具を作成
-- ========================================
-- 電動ドライバー
INSERT INTO tools (id, organization_id, name, model_number, manufacturer, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '電動ドライバー', 'DD-2000', 'マキタ', 5, 2, 'individual', NOW())
ON CONFLICT (id) DO NOTHING;

-- インパクトドライバー
INSERT INTO tools (id, organization_id, name, model_number, manufacturer, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'インパクトドライバー', 'TD-171D', 'マキタ', 3, 1, 'individual', NOW())
ON CONFLICT (id) DO NOTHING;

-- 電動サンダー
INSERT INTO tools (id, organization_id, name, model_number, manufacturer, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '電動サンダー', 'BO5041', 'マキタ', 4, 1, 'individual', NOW())
ON CONFLICT (id) DO NOTHING;

-- レーザー距離計
INSERT INTO tools (id, organization_id, name, model_number, manufacturer, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'レーザー距離計', 'GLM50C', 'BOSCH', 2, 1, 'individual', NOW())
ON CONFLICT (id) DO NOTHING;

-- 水平器
INSERT INTO tools (id, organization_id, name, model_number, manufacturer, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '水平器', 'LST-600', 'タジマ', 3, 1, 'individual', NOW())
ON CONFLICT (id) DO NOTHING;

-- 消耗品: 軍手
INSERT INTO tools (id, organization_id, name, unit, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '軍手', '双', 200, 50, 'consumable', NOW())
ON CONFLICT (id) DO NOTHING;

-- 消耗品: 養生テープ
INSERT INTO tools (id, organization_id, name, unit, quantity, minimum_stock, management_type, created_at)
VALUES ('40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', '養生テープ', '個', 30, 10, 'consumable', NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 7. 個別道具アイテムを作成
-- ========================================
-- 電動ドライバー個別アイテム（5台）
INSERT INTO tool_items (id, tool_id, organization_id, serial_number, qr_code, current_location, warehouse_location_id, status, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DD-001', '50000000-0000-0000-0000-000000000001', 'warehouse', '20000000-0000-0000-0000-000000000001', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DD-002', '50000000-0000-0000-0000-000000000002', 'site', NULL, 'in_use', NOW()),
  ('50000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DD-003', '50000000-0000-0000-0000-000000000003', 'warehouse', '20000000-0000-0000-0000-000000000002', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DD-004', '50000000-0000-0000-0000-000000000004', 'site', NULL, 'in_use', NOW()),
  ('50000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'DD-005', '50000000-0000-0000-0000-000000000005', 'warehouse', '20000000-0000-0000-0000-000000000001', 'available', NOW())
ON CONFLICT (id) DO NOTHING;

-- 現場にある道具のsite_idを更新
UPDATE tool_items SET site_id = '30000000-0000-0000-0000-000000000001' WHERE id = '50000000-0000-0000-0000-000000000002';
UPDATE tool_items SET site_id = '30000000-0000-0000-0000-000000000002' WHERE id = '50000000-0000-0000-0000-000000000004';

-- インパクトドライバー個別アイテム（3台）
INSERT INTO tool_items (id, tool_id, organization_id, serial_number, qr_code, current_location, warehouse_location_id, status, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'TD-001', '50000000-0000-0000-0000-000000000006', 'warehouse', '20000000-0000-0000-0000-000000000001', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'TD-002', '50000000-0000-0000-0000-000000000007', 'warehouse', '20000000-0000-0000-0000-000000000001', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'TD-003', '50000000-0000-0000-0000-000000000008', 'site', NULL, 'in_use', NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE tool_items SET site_id = '30000000-0000-0000-0000-000000000001' WHERE id = '50000000-0000-0000-0000-000000000008';

-- 電動サンダー個別アイテム（4台）
INSERT INTO tool_items (id, tool_id, organization_id, serial_number, qr_code, current_location, warehouse_location_id, status, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'BO-001', '50000000-0000-0000-0000-000000000009', 'warehouse', '20000000-0000-0000-0000-000000000002', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'BO-002', '50000000-0000-0000-0000-000000000010', 'warehouse', '20000000-0000-0000-0000-000000000002', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'BO-003', '50000000-0000-0000-0000-000000000011', 'warehouse', '20000000-0000-0000-0000-000000000002', 'available', NOW()),
  ('50000000-0000-0000-0000-0000-00000012', '40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'BO-004', '50000000-0000-0000-0000-000000000012', 'warehouse', '20000000-0000-0000-0000-000000000003', 'available', NOW())
ON CONFLICT (id) DO NOTHING;

-- レーザー距離計個別アイテム（2台）
INSERT INTO tool_items (id, tool_id, organization_id, serial_number, qr_code, current_location, warehouse_location_id, status, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GLM-001', '50000000-0000-0000-0000-000000000013', 'warehouse', '20000000-0000-0000-0000-000000000003', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GLM-002', '50000000-0000-0000-0000-000000000014', 'site', NULL, 'in_use', NOW())
ON CONFLICT (id) DO NOTHING;

UPDATE tool_items SET site_id = '30000000-0000-0000-0000-000000000003' WHERE id = '50000000-0000-0000-0000-000000000014';

-- 水平器個別アイテム（3台）
INSERT INTO tool_items (id, tool_id, organization_id, serial_number, qr_code, current_location, warehouse_location_id, status, created_at)
VALUES
  ('50000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'LST-001', '50000000-0000-0000-0000-000000000015', 'warehouse', '20000000-0000-0000-0000-000000000003', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'LST-002', '50000000-0000-0000-0000-000000000016', 'warehouse', '20000000-0000-0000-0000-000000000003', 'available', NOW()),
  ('50000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'LST-003', '50000000-0000-0000-0000-000000000017', 'warehouse', '20000000-0000-0000-0000-000000000001', 'available', NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 8. 消耗品在庫を作成
-- ========================================
-- 軍手の在庫
INSERT INTO consumable_inventory (id, tool_id, organization_id, location_type, site_id, warehouse_location_id, quantity, created_at)
VALUES
  ('60000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'warehouse', NULL, '20000000-0000-0000-0000-000000000001', 150, NOW()),
  ('60000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'site', '30000000-0000-0000-0000-000000000001', NULL, 30, NOW()),
  ('60000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'site', '30000000-0000-0000-0000-000000000002', NULL, 20, NOW())
ON CONFLICT (id) DO NOTHING;

-- 養生テープの在庫
INSERT INTO consumable_inventory (id, tool_id, organization_id, location_type, site_id, warehouse_location_id, quantity, created_at)
VALUES
  ('60000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'warehouse', NULL, '20000000-0000-0000-0000-000000000001', 25, NOW()),
  ('60000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'site', '30000000-0000-0000-0000-000000000001', NULL, 5, NOW())
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 完了メッセージ
-- ========================================
SELECT 'テストデータの投入が完了しました！' as message;
SELECT '管理者: admin@test.com / Test1234!' as admin_account;
SELECT 'スタッフ: staff@test.com / Test1234!' as staff_account;
