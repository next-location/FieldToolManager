-- ユーザーパスワード変更機能のためのテーブル作成
-- 作成日: 2026-01-19
-- 目的: ログイン後のパスワード変更機能（確認コード方式 + 再利用防止）

-- =============================================
-- 1. user_password_change_tokens テーブル
-- =============================================
-- パスワード変更時の確認コード（6桁）を管理

CREATE TABLE IF NOT EXISTS user_password_change_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_user_password_change_tokens_user_id ON user_password_change_tokens(user_id);
CREATE INDEX idx_user_password_change_tokens_token ON user_password_change_tokens(token);
CREATE INDEX idx_user_password_change_tokens_expires_at ON user_password_change_tokens(expires_at);
CREATE INDEX idx_user_password_change_tokens_used ON user_password_change_tokens(used);

-- コメント
COMMENT ON TABLE user_password_change_tokens IS 'ユーザーパスワード変更時の確認コード管理';
COMMENT ON COLUMN user_password_change_tokens.token IS '6桁の確認コード（例: 123456）';
COMMENT ON COLUMN user_password_change_tokens.expires_at IS '有効期限（10分）';
COMMENT ON COLUMN user_password_change_tokens.used IS '使用済みフラグ';

-- =============================================
-- 2. password_history テーブル
-- =============================================
-- パスワード再利用防止のための履歴管理（過去5個まで保存）

CREATE TABLE IF NOT EXISTS password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_password_history_user_id ON password_history(user_id);
CREATE INDEX idx_password_history_created_at ON password_history(user_id, created_at DESC);

-- コメント
COMMENT ON TABLE password_history IS 'パスワード履歴（再利用防止用）';
COMMENT ON COLUMN password_history.password_hash IS 'Supabase Authのパスワードハッシュ（bcrypt）';
COMMENT ON COLUMN password_history.created_at IS 'パスワード設定日時';

-- =============================================
-- 3. 古い確認コードの自動削除関数（オプション）
-- =============================================
-- 期限切れの確認コードを定期的に削除

CREATE OR REPLACE FUNCTION cleanup_expired_password_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_password_change_tokens
  WHERE expires_at < NOW() - INTERVAL '24 hours';
END;
$$;

COMMENT ON FUNCTION cleanup_expired_password_tokens IS '期限切れのパスワード変更確認コードを削除（24時間経過後）';

-- =============================================
-- 4. パスワード履歴のクリーンアップ関数
-- =============================================
-- 各ユーザーにつき最新5件のみを保持

CREATE OR REPLACE FUNCTION cleanup_old_password_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 新しいユーザーのパスワード履歴が5件を超えたら古いものを削除
  DELETE FROM password_history
  WHERE user_id = NEW.user_id
  AND id NOT IN (
    SELECT id FROM password_history
    WHERE user_id = NEW.user_id
    ORDER BY created_at DESC
    LIMIT 5
  );

  RETURN NEW;
END;
$$;

-- トリガー作成（パスワード履歴追加時に自動実行）
DROP TRIGGER IF EXISTS trigger_cleanup_old_password_history ON password_history;
CREATE TRIGGER trigger_cleanup_old_password_history
AFTER INSERT ON password_history
FOR EACH ROW
EXECUTE FUNCTION cleanup_old_password_history();

COMMENT ON FUNCTION cleanup_old_password_history IS 'パスワード履歴を最新5件に制限';
