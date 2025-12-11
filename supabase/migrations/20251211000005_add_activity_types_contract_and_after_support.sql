-- Add 'contract' and 'after_support' to sales_activities activity_type constraint
-- 営業活動の種別に「契約」と「アフターサポート」を追加

ALTER TABLE sales_activities DROP CONSTRAINT IF EXISTS sales_activities_activity_type_check;

ALTER TABLE sales_activities ADD CONSTRAINT sales_activities_activity_type_check
CHECK (activity_type = ANY (ARRAY[
  'phone_call'::text,
  'email'::text,
  'inquiry_form'::text,
  'meeting'::text,
  'online_meeting'::text,
  'proposal_sent'::text,
  'follow_up'::text,
  'status_change'::text,
  'contract'::text,
  'after_support'::text,
  'other'::text
]));

COMMENT ON CONSTRAINT sales_activities_activity_type_check ON sales_activities IS
'営業活動種別: phone_call(電話), email(メール), inquiry_form(問い合わせフォーム), meeting(面談), online_meeting(オンライン面談), proposal_sent(提案書送付), follow_up(フォローアップ), status_change(ステータス変更), contract(契約), after_support(アフターサポート), other(その他)';
