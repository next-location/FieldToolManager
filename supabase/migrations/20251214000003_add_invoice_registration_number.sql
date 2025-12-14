-- インボイス番号カラムを追加（2025-12-14）
-- 適格請求書発行事業者の登録番号（Tから始まる13桁の番号）

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS invoice_registration_number TEXT;

COMMENT ON COLUMN organizations.invoice_registration_number IS '適格請求書発行事業者の登録番号（Tから始まる13桁の番号）';
