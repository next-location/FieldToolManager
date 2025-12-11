-- 契約テーブルに初期費用関連のカラムを追加

-- 初期費用カラムの追加
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS initial_setup_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_data_registration_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_onsite_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_training_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_other_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_initial_fee NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS initial_fee_paid BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS initial_fee_paid_at TIMESTAMP WITH TIME ZONE;

-- 請求担当者情報カラムの追加
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS billing_contact_name TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_email TEXT,
ADD COLUMN IF NOT EXISTS billing_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- コメント追加
COMMENT ON COLUMN contracts.initial_setup_fee IS '初期設定費';
COMMENT ON COLUMN contracts.initial_data_registration_fee IS '初期データ登録費';
COMMENT ON COLUMN contracts.initial_onsite_fee IS '初期オンサイト作業費';
COMMENT ON COLUMN contracts.initial_training_fee IS '初期研修費';
COMMENT ON COLUMN contracts.initial_other_fee IS '初期その他費用';
COMMENT ON COLUMN contracts.total_initial_fee IS '初期費用合計';
COMMENT ON COLUMN contracts.initial_fee_paid IS '初期費用支払済みフラグ';
COMMENT ON COLUMN contracts.initial_fee_paid_at IS '初期費用支払日時';
COMMENT ON COLUMN contracts.billing_contact_name IS '請求担当者名';
COMMENT ON COLUMN contracts.billing_contact_email IS '請求担当者メールアドレス';
COMMENT ON COLUMN contracts.billing_contact_phone IS '請求担当者電話番号';
COMMENT ON COLUMN contracts.billing_address IS '請求先住所';
