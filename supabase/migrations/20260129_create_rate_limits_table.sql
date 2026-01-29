-- レート制限テーブル
-- サーバーレス環境でレート制限を実現するためのストレージ

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE, -- IPアドレスまたは識別子
  count INTEGER NOT NULL DEFAULT 1, -- リクエスト回数
  reset_at TIMESTAMPTZ NOT NULL, -- リセット時刻
  blocked_until TIMESTAMPTZ, -- ブロック解除時刻（nullの場合はブロックなし）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at);

-- RLSポリシー（サービスロールキーでのみアクセス可能）
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- サービスロールキーからのアクセスを許可
-- 注: 通常のユーザーはこのテーブルにアクセスできない
CREATE POLICY "Service role can manage rate limits"
ON rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- コメント追加
COMMENT ON TABLE rate_limits IS 'サーバーレス環境でのレート制限を管理するテーブル';
COMMENT ON COLUMN rate_limits.identifier IS 'IPアドレスまたは識別子（例: 192.168.1.1）';
COMMENT ON COLUMN rate_limits.count IS '現在の時間窓内でのリクエスト回数';
COMMENT ON COLUMN rate_limits.reset_at IS 'カウントがリセットされる時刻';
COMMENT ON COLUMN rate_limits.blocked_until IS 'ブロック解除時刻（nullの場合はブロックなし）';
