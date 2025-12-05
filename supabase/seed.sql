-- テスト用組織を作成
INSERT INTO organizations (id, name, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'テスト建設株式会社', NOW())
ON CONFLICT (id) DO NOTHING;

-- ユーザーは npm run db:reset 実行時に自動作成されます
-- ログイン情報:
-- 管理者: admin@test.com / Test1234!
-- スタッフ: staff@test.com / Test1234!
