-- 工事データが表示されない問題のデバッグSQL
-- Supabase Dashboard の SQL Editor で実行してください

-- 1. 工事データの存在確認
SELECT COUNT(*) as total_projects
FROM projects
WHERE deleted_at IS NULL;

-- 2. 工事データの詳細（site_id の状態確認）
SELECT
  id,
  project_name,
  project_code,
  site_id,
  client_id,
  deleted_at,
  organization_id
FROM projects
WHERE deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 10;

-- 3. site_id が NULL の工事
SELECT
  id,
  project_name,
  site_id
FROM projects
WHERE deleted_at IS NULL
  AND site_id IS NULL
LIMIT 5;

-- 4. site_id がある工事
SELECT
  id,
  project_name,
  site_id
FROM projects
WHERE deleted_at IS NULL
  AND site_id IS NOT NULL
LIMIT 5;

-- 5. 工事と現場の LEFT JOIN テスト
SELECT
  p.id,
  p.project_name,
  p.site_id,
  s.site_name,
  s.deleted_at as site_deleted
FROM projects p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 6. 工事と取引先の LEFT JOIN テスト
SELECT
  p.id,
  p.project_name,
  p.client_id,
  c.name as client_name,
  c.deleted_at as client_deleted
FROM projects p
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 7. すべての関連テーブルを LEFT JOIN（本番クエリと同じ）
SELECT
  p.id,
  p.project_name,
  p.project_code,
  p.site_id,
  s.site_name,
  s.site_code,
  c.name as client_name
FROM projects p
LEFT JOIN sites s ON p.site_id = s.id
LEFT JOIN clients c ON p.client_id = c.id
WHERE p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 10;

-- 8. RLS ポリシーの確認（organization_id でフィルタ）
-- 注意: YOUR_ORG_ID を実際の organization_id に置き換えてください
SELECT
  p.id,
  p.project_name,
  p.organization_id,
  s.site_name
FROM projects p
LEFT JOIN sites s ON p.site_id = s.id
WHERE p.deleted_at IS NULL
  AND p.organization_id = 'YOUR_ORG_ID'  -- ここを実際のIDに置き換え
ORDER BY p.created_at DESC
LIMIT 10;
