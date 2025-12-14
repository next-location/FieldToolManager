-- clientsテーブルに不足しているカラムを追加

-- 略称カラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS short_name TEXT;

-- 業種カラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS industry TEXT;

-- ウェブサイトカラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS website TEXT;

-- 担当部署カラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS contact_department TEXT;

-- 法人番号カラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS tax_id TEXT;

-- 評価カラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- 社内用メモカラム（APIで使用されているが存在しない）
ALTER TABLE clients ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- カラム名の別名エイリアス（API互換性のため）
-- bank_branch（API）とbranch_name（DB）の統一
ALTER TABLE clients RENAME COLUMN branch_name TO bank_branch;

-- bank_account_type（API）とaccount_type（DB）の統一
ALTER TABLE clients RENAME COLUMN account_type TO bank_account_type;

-- bank_account_number（API）とaccount_number（DB）の統一
ALTER TABLE clients RENAME COLUMN account_number TO bank_account_number;

-- bank_account_holder（API）とaccount_name（DB）の統一
ALTER TABLE clients RENAME COLUMN account_name TO bank_account_holder;

-- client_typeに'partner'を追加
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_client_type_check;
ALTER TABLE clients ADD CONSTRAINT clients_client_type_check
  CHECK (client_type IN ('customer', 'supplier', 'partner', 'both'));

-- コメント追加
COMMENT ON COLUMN clients.short_name IS '取引先略称';
COMMENT ON COLUMN clients.industry IS '業種';
COMMENT ON COLUMN clients.website IS 'ウェブサイトURL';
COMMENT ON COLUMN clients.contact_department IS '担当者部署';
COMMENT ON COLUMN clients.tax_id IS '法人番号';
COMMENT ON COLUMN clients.rating IS '評価（1-5）';
COMMENT ON COLUMN clients.internal_notes IS '社内用メモ';
