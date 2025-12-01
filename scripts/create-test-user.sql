-- テストユーザーをusersテーブルに追加
-- 注意: このスクリプトを実行する前に、Supabase Studioで作成したユーザーのUUIDを確認してください

-- 1. Supabase Studio (http://127.0.0.1:54323) にアクセス
-- 2. Authentication > Users でユーザーのUUIDをコピー
-- 3. 以下のXXXXXXXX部分を実際のUUIDに置き換えて実行

-- 例: admin@test.comユーザーのUUIDが '12345678-1234-1234-1234-123456789012' の場合
INSERT INTO users (id, organization_id, email, name, role, is_active)
VALUES
  (
    'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',  -- ここをSupabase AuthのユーザーUUIDに置き換える
    '00000000-0000-0000-0000-000000000001',  -- テスト組織のID
    'admin@test.com',
    'テスト管理者',
    'admin',
    true
  )
ON CONFLICT (id) DO UPDATE
SET
  organization_id = EXCLUDED.organization_id,
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role;
