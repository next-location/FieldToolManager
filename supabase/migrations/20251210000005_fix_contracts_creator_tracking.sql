-- 契約作成者の追跡を修正
-- created_by（users参照）とsuper_admin_created_by（super_admins参照）を分離

-- 1. スーパーアドミン作成者用のカラムを追加
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS super_admin_created_by UUID;

-- 2. 既存データでcreated_byがsuper_adminのIDの場合、super_admin_created_byに移動
UPDATE contracts
SET super_admin_created_by = created_by, created_by = NULL
WHERE created_by IN (SELECT id FROM super_admins);

-- 3. 外部キー制約を再追加（NULL許可）
ALTER TABLE contracts ADD CONSTRAINT contracts_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- 4. スーパーアドミン作成者の外部キー制約を追加
ALTER TABLE contracts ADD CONSTRAINT contracts_super_admin_created_by_fkey
  FOREIGN KEY (super_admin_created_by) REFERENCES super_admins(id) ON DELETE SET NULL;

-- 5. CHECK制約：created_byとsuper_admin_created_byのどちらか一方のみ設定されることを保証
ALTER TABLE contracts ADD CONSTRAINT contracts_creator_check
  CHECK (
    (created_by IS NOT NULL AND super_admin_created_by IS NULL) OR
    (created_by IS NULL AND super_admin_created_by IS NOT NULL)
  );

COMMENT ON COLUMN contracts.created_by IS '作成者ID（通常のユーザー、users.id参照）';
COMMENT ON COLUMN contracts.super_admin_created_by IS 'スーパーアドミン作成者ID（super_admins.id参照）';
COMMENT ON CONSTRAINT contracts_creator_check ON contracts IS 'created_byとsuper_admin_created_byのどちらか一方のみ必須';
