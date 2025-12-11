-- contractsテーブルのplan check制約を修正
-- 旧: basic, premium, enterprise
-- 新: start, standard, business, pro, enterprise + 既存値も許可

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_plan_check;

ALTER TABLE contracts ADD CONSTRAINT contracts_plan_check
  CHECK (plan IN ('start', 'standard', 'business', 'pro', 'enterprise', 'basic', 'premium'));

COMMENT ON CONSTRAINT contracts_plan_check ON contracts IS 'プラン: start(~10名), standard(~30名), business(~50名), pro(~100名), enterprise(101名~) ※basic,premiumは旧データ用';
