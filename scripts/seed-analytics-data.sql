-- 分析機能用のサンプルデータを作成

-- 工具マスターデータを追加（個別管理）
INSERT INTO tools (organization_id, name, purchase_price, current_location, status)
SELECT
  o.id,
  tool.name,
  tool.price,
  'warehouse',
  'available'
FROM organizations o
CROSS JOIN (VALUES
  ('電動ドライバー', 15000),
  ('ハンマー', 2000),
  ('のこぎり', 3000),
  ('電動サンダー', 25000),
  ('メジャー', 1500)
) AS tool(name, price)
LIMIT 5
ON CONFLICT DO NOTHING;

-- 消耗品を追加
INSERT INTO tools (organization_id, name, purchase_price, current_location, status, management_type, quantity, unit)
SELECT
  o.id,
  consumable.name,
  consumable.price,
  'warehouse',
  'available',
  'consumable',
  100,
  consumable.unit
FROM organizations o
CROSS JOIN (VALUES
  ('ネジ（M8）', 500, '箱'),
  ('釘', 300, '箱'),
  ('軍手', 200, '組'),
  ('マスク', 150, '枚')
) AS consumable(name, price, unit)
LIMIT 4
ON CONFLICT DO NOTHING;

-- 請求書データを追加
INSERT INTO billing_invoices (
  organization_id,
  client_id,
  invoice_number,
  invoice_date,
  due_date,
  title,
  subtotal,
  tax_amount,
  total_amount,
  status
)
SELECT
  o.id,
  c.id,
  'INV-' || TO_CHAR(date_series, 'YYYYMM') || '-' || LPAD(ROW_NUMBER() OVER (PARTITION BY DATE_TRUNC('month', date_series) ORDER BY date_series)::text, 3, '0'),
  date_series::date,
  (date_series + INTERVAL '30 days')::date,
  '工事請負代金',
  amount,
  amount * 0.1,
  amount * 1.1,
  CASE
    WHEN date_series < CURRENT_DATE - INTERVAL '30 days' THEN 'paid'
    WHEN date_series < CURRENT_DATE THEN 'sent'
    ELSE 'draft'
  END
FROM organizations o
CROSS JOIN clients c
CROSS JOIN generate_series(
  CURRENT_DATE - INTERVAL '6 months',
  CURRENT_DATE,
  INTERVAL '15 days'
) AS date_series
CROSS JOIN (VALUES (500000), (750000), (1000000), (300000)) AS amounts(amount)
WHERE c.organization_id = o.id
LIMIT 20;

-- 工具移動履歴を追加
INSERT INTO tool_movements (
  organization_id,
  tool_id,
  from_location,
  to_location,
  to_site_id,
  movement_type,
  performed_by,
  quantity
)
SELECT
  o.id,
  t.id,
  'warehouse',
  'site',
  s.id,
  'check_out',
  u.id,
  1
FROM organizations o
CROSS JOIN tools t
CROSS JOIN sites s
CROSS JOIN users u
WHERE t.organization_id = o.id
  AND t.management_type = 'individual'
  AND s.organization_id = o.id
  AND u.organization_id = o.id
LIMIT 10;

SELECT '✅ 分析用サンプルデータの作成が完了しました' as message;
