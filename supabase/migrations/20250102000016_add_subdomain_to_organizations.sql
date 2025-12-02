-- organizationsテーブルにsubdomainカラムを追加
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_organizations_subdomain ON organizations(subdomain);

-- 既存の組織にデフォルトのサブドメインを設定
UPDATE organizations
SET subdomain = 'demo'
WHERE subdomain IS NULL;
