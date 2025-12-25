-- スキーマキャッシュを強制リロードするため、カラムを一度削除して再追加
ALTER TABLE organizations DROP COLUMN IF EXISTS billing_contact_name;
ALTER TABLE organizations DROP COLUMN IF EXISTS billing_contact_email;
ALTER TABLE organizations DROP COLUMN IF EXISTS billing_contact_phone;
ALTER TABLE organizations DROP COLUMN IF EXISTS billing_address;
ALTER TABLE organizations DROP COLUMN IF EXISTS fax;
ALTER TABLE organizations DROP COLUMN IF EXISTS email;

-- 再追加
ALTER TABLE organizations ADD COLUMN billing_contact_name TEXT;
ALTER TABLE organizations ADD COLUMN billing_contact_email TEXT;
ALTER TABLE organizations ADD COLUMN billing_contact_phone TEXT;
ALTER TABLE organizations ADD COLUMN billing_address TEXT;
ALTER TABLE organizations ADD COLUMN fax TEXT;
ALTER TABLE organizations ADD COLUMN email TEXT;

-- インデックス再作成
CREATE INDEX IF NOT EXISTS idx_organizations_billing_email ON organizations(billing_contact_email) WHERE billing_contact_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_phone ON organizations(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email) WHERE email IS NOT NULL;

-- スキーマリロード通知
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
