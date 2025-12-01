-- ========================================
-- Simplified RLS Policies
-- usersテーブルへのアクセスを許可
-- ========================================

-- 既存のusersテーブルのポリシーを削除
DROP POLICY IF EXISTS "Users can view organization users" ON users;
DROP POLICY IF EXISTS "Organization admins can insert users" ON users;
DROP POLICY IF EXISTS "Organization admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 認証済みユーザーは自分のレコードを読み取れる
CREATE POLICY "Users can view own record"
    ON users FOR SELECT
    USING (id = auth.uid());

-- 認証済みユーザーは自分のレコードを更新できる
CREATE POLICY "Users can update own record"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
