-- デモ申請テーブル
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  person_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  department TEXT,
  employee_count TEXT,
  tool_count TEXT,
  timeline TEXT,
  message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW(),

  -- デモアカウント情報
  demo_email TEXT UNIQUE,
  demo_password_hash TEXT,
  demo_user_id UUID,
  demo_company_id UUID,
  demo_expires_at TIMESTAMP,
  demo_activated_at TIMESTAMP,

  -- ステータス
  status TEXT DEFAULT 'pending', -- pending/approved/expired/converted

  -- KPI追跡
  pdf_downloaded_at TIMESTAMP,
  demo_login_count INTEGER DEFAULT 0,
  last_demo_login_at TIMESTAMP,

  -- 営業管理
  assigned_to TEXT,
  follow_up_date DATE,
  notes TEXT
);

-- デモ活動ログテーブル
CREATE TABLE IF NOT EXISTS demo_activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  demo_request_id UUID REFERENCES demo_requests(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- login/feature_use/export_attempt等
  feature_name TEXT,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_demo_requests_email ON demo_requests(email);
CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_created_at ON demo_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_demo_requests_demo_email ON demo_requests(demo_email);
CREATE INDEX IF NOT EXISTS idx_demo_activity_logs_request_id ON demo_activity_logs(demo_request_id);
CREATE INDEX IF NOT EXISTS idx_demo_activity_logs_created_at ON demo_activity_logs(created_at);

-- RLSポリシー
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_activity_logs ENABLE ROW LEVEL SECURITY;

-- 公開APIからの挿入を許可（認証不要）
CREATE POLICY "Allow public insert on demo_requests" ON demo_requests
  FOR INSERT
  WITH CHECK (true);

-- サービスロールからの全操作を許可（バックエンドAPI用）
CREATE POLICY "Service role can do all on demo_requests" ON demo_requests
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can do all on demo_activity_logs" ON demo_activity_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ログインカウント増加関数
CREATE OR REPLACE FUNCTION increment_demo_login(request_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE demo_requests
  SET
    demo_login_count = demo_login_count + 1,
    last_demo_login_at = NOW()
  WHERE id = request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 24時間以内の重複申請チェック関数
CREATE OR REPLACE FUNCTION check_duplicate_demo_request(
  p_email TEXT,
  p_ip_address TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM demo_requests
    WHERE (email = p_email OR ip_address = p_ip_address)
    AND created_at > NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
