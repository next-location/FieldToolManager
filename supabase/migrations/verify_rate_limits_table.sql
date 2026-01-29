-- レート制限テーブルの作成確認用SQL
-- Supabase Dashboard の SQL Editor で実行してください

-- 1. テーブルが存在するか確認
SELECT
  'rate_limits テーブル' AS check_item,
  CASE
    WHEN EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'rate_limits'
    )
    THEN '✅ 存在します'
    ELSE '❌ 存在しません'
  END AS status;

-- 2. カラム一覧を表示
SELECT
  column_name AS "カラム名",
  data_type AS "データ型",
  is_nullable AS "NULL許可",
  column_default AS "デフォルト値"
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'rate_limits'
ORDER BY ordinal_position;

-- 3. インデックス一覧を表示
SELECT
  indexname AS "インデックス名",
  indexdef AS "定義"
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'rate_limits';

-- 4. RLSポリシーを確認
SELECT
  policyname AS "ポリシー名",
  roles AS "対象ロール",
  cmd AS "コマンド",
  qual AS "条件"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'rate_limits';

-- 5. テーブルのコメントを確認
SELECT
  obj_description('public.rate_limits'::regclass) AS "テーブルの説明";

-- 6. 現在のレコード数を表示（0件が正常）
SELECT
  COUNT(*) AS "現在のレコード数"
FROM rate_limits;
