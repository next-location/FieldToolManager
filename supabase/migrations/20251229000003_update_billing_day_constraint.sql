-- billing_dayのチェック制約を修正
-- 1-28または99（月末）を許可

-- 既存の制約を削除
ALTER TABLE contracts
DROP CONSTRAINT IF EXISTS contracts_billing_day_check;

-- 新しい制約を追加（1-28または99）
ALTER TABLE contracts
ADD CONSTRAINT contracts_billing_day_check
CHECK (billing_day >= 1 AND billing_day <= 28 OR billing_day = 99);

-- コメント更新
COMMENT ON COLUMN contracts.billing_day IS '請求日（1-28日または99=月末、土日祝日の場合は前営業日に自動調整）';
