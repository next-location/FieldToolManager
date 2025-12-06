-- ========================================
-- usersテーブルに印鑑データ保存列を追加
-- ========================================

-- personal_seal_data: 印鑑画像データ（Base64エンコードされたPNG/SVG）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS personal_seal_data TEXT;

-- インデックス追加（印鑑データの有無で検索する場合に備えて）
CREATE INDEX IF NOT EXISTS idx_users_has_personal_seal
ON users((personal_seal_data IS NOT NULL));

-- コメント追加
COMMENT ON COLUMN users.personal_seal_data IS '個人印鑑データ（Base64エンコードされたPNG/SVG）- シャチハタ風円形印鑑';
