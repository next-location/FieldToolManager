-- 現場リーダーQRコード発行履歴テーブルを作成
CREATE TABLE IF NOT EXISTS site_leader_qr_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  site_id UUID REFERENCES sites(id) ON DELETE SET NULL,
  qr_code_data TEXT NOT NULL,
  generated_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_site_leader_qr_logs_organization ON site_leader_qr_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_site_leader_qr_logs_site ON site_leader_qr_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_site_leader_qr_logs_generated_by ON site_leader_qr_logs(generated_by);
CREATE INDEX IF NOT EXISTS idx_site_leader_qr_logs_is_active ON site_leader_qr_logs(is_active);

-- RLSを有効化
ALTER TABLE site_leader_qr_logs ENABLE ROW LEVEL SECURITY;

-- 組織内のユーザーが自組織のQRコードログを閲覧できる
CREATE POLICY "Users can view their organization's QR logs"
  ON site_leader_qr_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- リーダー・管理者がQRコードを発行できる
CREATE POLICY "Leaders and admins can generate QR codes"
  ON site_leader_qr_logs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('leader', 'manager', 'admin')
    )
  );

-- 管理者がQRコードログを更新できる
CREATE POLICY "Admins can update QR logs"
  ON site_leader_qr_logs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );
