-- 営業ステータスに「失注」(lost)を追加

-- organizationsテーブルのsales_statusチェック制約を更新
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS organizations_sales_status_check;

ALTER TABLE organizations ADD CONSTRAINT organizations_sales_status_check
CHECK (sales_status = ANY (ARRAY[
  'not_contacted'::text,
  'appointment'::text,
  'prospect'::text,
  'proposal'::text,
  'negotiation'::text,
  'contracting'::text,
  'contracted'::text,
  'cancelled'::text,
  'lost'::text,
  'do_not_contact'::text
]));

COMMENT ON CONSTRAINT organizations_sales_status_check ON organizations IS
'営業ステータス: not_contacted(未接触), appointment(アポ取得), prospect(見込み客), proposal(提案中), negotiation(商談中), contracting(契約手続き中), contracted(契約中), cancelled(契約解除), lost(失注), do_not_contact(連絡不要)';
