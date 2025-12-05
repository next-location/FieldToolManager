-- ユーザーテーブルのRLS無限ループ問題を修正
-- 問題: users_select_own_organizationポリシーがusersテーブルを参照して無限ループ

-- 問題のあるポリシーを削除
DROP POLICY IF EXISTS "users_select_own_organization" ON users;
DROP POLICY IF EXISTS "Users can view own record" ON users;

-- シンプルなポリシーに置き換え（無限ループしない）
-- 認証済みユーザーは全てのユーザーを閲覧可能（organization_idによるフィルタはアプリケーション層で行う）
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "users_select_authenticated" ON users IS '認証済みユーザーは全ユーザーを閲覧可能（組織フィルタはアプリ層）';
