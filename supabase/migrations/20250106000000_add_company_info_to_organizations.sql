-- Add company information columns to organizations table
-- Required for PDF template header (company info section)

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS fax TEXT,
ADD COLUMN IF NOT EXISTS company_seal_url TEXT;

COMMENT ON COLUMN organizations.postal_code IS '郵便番号';
COMMENT ON COLUMN organizations.address IS '住所';
COMMENT ON COLUMN organizations.phone IS '電話番号';
COMMENT ON COLUMN organizations.fax IS 'FAX番号（任意）';
COMMENT ON COLUMN organizations.company_seal_url IS '角印画像URL（将来実装）';
