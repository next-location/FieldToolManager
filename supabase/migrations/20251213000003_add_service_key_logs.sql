-- サービスキーアクセスログテーブルの作成
CREATE TABLE IF NOT EXISTS public.service_key_access_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.super_admins(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('encrypt', 'decrypt', 'rotate')),
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- インデックス
CREATE INDEX idx_service_key_logs_admin_id ON public.service_key_access_logs(admin_id);
CREATE INDEX idx_service_key_logs_timestamp ON public.service_key_access_logs(timestamp);
CREATE INDEX idx_service_key_logs_action ON public.service_key_access_logs(action);

-- RLSポリシー
ALTER TABLE public.service_key_access_logs ENABLE ROW LEVEL SECURITY;

-- スーパーアドミンのみがアクセス可能
CREATE POLICY "Super admins can view service key logs"
  ON public.service_key_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = auth.uid()
        AND super_admins.is_active = true
    )
  );

-- システムのみが挿入可能（サービスロールキー経由）
CREATE POLICY "System can insert service key logs"
  ON public.service_key_access_logs
  FOR INSERT
  WITH CHECK (true);

-- コメント
COMMENT ON TABLE public.service_key_access_logs IS 'Supabaseサービスロールキーのアクセスログ';
COMMENT ON COLUMN public.service_key_access_logs.admin_id IS '操作を行った管理者ID';
COMMENT ON COLUMN public.service_key_access_logs.action IS '操作種別（encrypt/decrypt/rotate）';
COMMENT ON COLUMN public.service_key_access_logs.metadata IS '追加メタデータ';
COMMENT ON COLUMN public.service_key_access_logs.ip_address IS 'アクセス元IPアドレス';
COMMENT ON COLUMN public.service_key_access_logs.user_agent IS 'ユーザーエージェント';