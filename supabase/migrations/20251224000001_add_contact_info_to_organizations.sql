-- Add contact information columns to organizations table
-- Migration: 20251224000001_add_contact_info_to_organizations

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS representative_name TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add comments for documentation
COMMENT ON COLUMN organizations.representative_name IS '代表者名';
COMMENT ON COLUMN organizations.postal_code IS '郵便番号';
COMMENT ON COLUMN organizations.address IS '住所';
COMMENT ON COLUMN organizations.phone IS '電話番号';
COMMENT ON COLUMN organizations.fax IS 'FAX番号';
COMMENT ON COLUMN organizations.email IS 'メールアドレス';

-- Create indexes for duplicate checking
CREATE INDEX IF NOT EXISTS idx_organizations_phone ON organizations(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_organizations_email ON organizations(email) WHERE email IS NOT NULL;
