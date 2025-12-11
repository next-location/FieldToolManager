-- usersテーブルにmust_change_passwordカラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;

-- 既存レコードはfalseに設定（既に使っているユーザー）
UPDATE users SET must_change_password = false WHERE must_change_password IS NULL;

-- コメント追加
COMMENT ON COLUMN users.must_change_password IS '初回ログイン時にパスワード変更を強制するフラグ';
