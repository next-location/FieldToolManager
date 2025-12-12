-- ===================================
-- 2FA バックアップコード追加マイグレーション
-- ===================================

-- super_admins テーブルにバックアップコード用カラムを追加
ALTER TABLE super_admins
ADD COLUMN IF NOT EXISTS backup_codes TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS backup_codes_used TEXT[] DEFAULT ARRAY[]::TEXT[];

-- カラムのコメント追加
COMMENT ON COLUMN super_admins.backup_codes IS '2FA バックアップコード（ハッシュ化された状態で保存）';
COMMENT ON COLUMN super_admins.backup_codes_used IS '使用済みバックアップコード（ハッシュ化された状態で保存）';
