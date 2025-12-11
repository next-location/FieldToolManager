-- テスト組織に契約データを追加

-- 既存の契約を削除
DELETE FROM contract_packages WHERE contract_id IN (
  SELECT id FROM contracts WHERE organization_id = '00000000-0000-0000-0000-000000000001'
);
DELETE FROM contracts WHERE organization_id = '00000000-0000-0000-0000-000000000001';

-- スタンダードプランの契約を作成
INSERT INTO contracts (
  id,
  organization_id,
  contract_number,
  contract_type,
  plan,
  plan_type,
  status,
  start_date,
  user_limit,
  monthly_fee,
  base_monthly_fee,
  package_monthly_fee,
  auto_renew,
  has_asset_package,
  created_by,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000001',
  'CNT-TEST-001',
  'monthly',
  'premium',
  'standard',
  'active',
  '2025-01-01',
  30,
  18000,
  15000,
  3000,
  true,
  true,
  '10000000-0000-0000-0000-000000000001',
  NOW(),
  NOW()
);

-- 財務分析パッケージのIDを取得して契約に紐付け
INSERT INTO contract_packages (
  contract_id,
  package_id
)
SELECT
  (SELECT id FROM contracts WHERE organization_id = '00000000-0000-0000-0000-000000000001' ORDER BY created_at DESC LIMIT 1),
  id
FROM packages
WHERE package_key = 'financial_analysis'
LIMIT 1;

-- 確認
SELECT
  c.contract_number,
  c.plan_type,
  c.plan,
  c.contract_type,
  c.base_monthly_fee,
  c.package_monthly_fee,
  c.monthly_fee,
  o.name as organization_name
FROM contracts c
JOIN organizations o ON c.organization_id = o.id
WHERE c.organization_id = '00000000-0000-0000-0000-000000000001';
