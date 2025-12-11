-- contracts.created_byの外部キー制約を削除
-- 理由: スーパーアドミンがcontractを作成する場合、created_byはsuper_adminsテーブルのIDを指すため
-- usersテーブルへの外部キーは不適切

ALTER TABLE contracts DROP CONSTRAINT IF EXISTS contracts_created_by_fkey;

COMMENT ON COLUMN contracts.created_by IS '作成者ID（super_admins.idまたはusers.id）';
