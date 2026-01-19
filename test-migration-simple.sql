-- 工事・現場統合機能の簡易テストSQL
-- Supabase Dashboard の SQL Editor で実行してください

-- Test 1: site_id カラムの存在確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'projects'
  AND column_name = 'site_id';

-- Test 2: 外部キー制約の確認
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
LEFT JOIN information_schema.referential_constraints AS rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'projects'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'site_id';

-- Test 3: インデックスの確認
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'projects'
  AND indexname = 'idx_projects_site_id';

-- Test 4: ビューの確認
SELECT COUNT(*) as projects_without_site
FROM v_projects_without_site;

-- Test 5: 現場に紐づいた工事の件数
SELECT
  COUNT(*) as total_projects,
  COUNT(site_id) as projects_with_site,
  COUNT(*) - COUNT(site_id) as projects_without_site
FROM projects
WHERE deleted_at IS NULL;

-- Test 6: 工事と現場の JOIN テスト
SELECT
  p.id,
  p.project_name,
  p.project_code,
  p.site_id,
  s.site_name,
  s.site_code,
  s.address
FROM projects p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.deleted_at IS NULL
LIMIT 5;
