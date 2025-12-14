-- リーダー権限をusersテーブルのrole制約に追加

-- 既存の制約を削除
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- 新しい制約を追加（leaderを含む）
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'manager', 'leader', 'user'));

-- 既存のmanagerロールをleaderに変更する場合のコメント
-- UPDATE users SET role = 'leader' WHERE role = 'manager' AND [条件];