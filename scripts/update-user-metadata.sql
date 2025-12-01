-- Supabase Authのユーザーメタデータにorganization_idを追加
--
-- 手順:
-- 1. Supabase Studio (http://127.0.0.1:54323) にアクセス
-- 2. Authentication > Users でユーザーのUUIDを確認
-- 3. 以下のSQLを実行（UUIDを実際の値に置き換える）

-- まず、usersテーブルから組織IDを確認
SELECT id, email, organization_id FROM users WHERE email = 'admin@test.com';

-- 次に、auth.usersテーブルを更新
-- ※ auth.usersテーブルはSupabaseが管理しているため、直接更新できません
-- 代わりに、アプリケーション側でログイン時にセッションに組織IDを設定します
