-- 組織テーブルに請求情報カラムを追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- カラムのコメント追加
COMMENT ON COLUMN organizations.billing_contact_name IS '請求担当者名';
COMMENT ON COLUMN organizations.billing_contact_email IS '請求担当者メールアドレス';
COMMENT ON COLUMN organizations.billing_contact_phone IS '請求担当者電話番号';
COMMENT ON COLUMN organizations.billing_address IS '請求先住所';
