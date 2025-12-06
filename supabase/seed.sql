-- テスト用組織を作成
INSERT INTO organizations (id, name, postal_code, address, phone, fax, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'A建設工業株式会社',
    '123-4567',
    '東京都渋谷区神宮前1-1-1',
    '03-1234-5678',
    '03-1234-5679',
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ユーザーは npm run db:reset 実行時に自動作成されます
-- ログイン情報:
-- 管理者: admin@test.com / Test1234!
-- スタッフ: staff@test.com / Test1234!
