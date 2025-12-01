-- テスト用組織を作成
INSERT INTO organizations (id, name, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'テスト建設株式会社', NOW())
ON CONFLICT (id) DO NOTHING;

-- 注意: ユーザー作成はSupabase Authを使用する必要があります
-- このスクリプトの後、以下の手順でテストユーザーを作成してください:
--
-- 1. Supabase Studioにアクセス: http://127.0.0.1:54323
-- 2. Authentication > Users > Add User から以下のユーザーを作成:
--
-- 管理者 (admin)
--    Email: admin@test.com
--    Password: admin123456
--
-- リーダー (leader)
--    Email: leader@test.com
--    Password: leader123456
--
-- スタッフ (staff)
--    Email: staff@test.com
--    Password: staff123456
--
-- 3. 作成後、usersテーブルに各ユーザーのレコードを挿入してorganization_idと紐付けます
