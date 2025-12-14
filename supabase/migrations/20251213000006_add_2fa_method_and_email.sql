-- 二要素認証の方法とメールアドレスを追加
-- TOTP（認証アプリ）とEmail（メール送信）の両方をサポート

-- two_factor_method カラムを追加（デフォルトはtotp）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_method VARCHAR(10) CHECK (two_factor_method IN ('totp', 'email'));

-- two_factor_email カラムを追加（ログインメールとは別のメールアドレス）
ALTER TABLE users
ADD COLUMN IF NOT EXISTS two_factor_email VARCHAR(255);

-- コメント追加
COMMENT ON COLUMN users.two_factor_method IS '二要素認証の方法: totp（認証アプリ）またはemail（メール送信）';
COMMENT ON COLUMN users.two_factor_email IS '二要素認証用のメールアドレス（ログインメールとは別）。メール方式の場合に使用';
