-- Create attendance_alerts table for notification management

CREATE TABLE attendance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  target_user_id UUID REFERENCES users(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'checkin_reminder',      -- 出勤忘れ通知
    'checkout_reminder',     -- 退勤忘れ通知
    'qr_expiry_warning',     -- QR期限切れ警告
    'overtime_alert',        -- 長時間労働アラート
    'daily_report'           -- 管理者向け日次レポート
  )),
  target_date DATE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_attendance_alerts_org ON attendance_alerts(organization_id);
CREATE INDEX idx_attendance_alerts_user ON attendance_alerts(target_user_id);
CREATE INDEX idx_attendance_alerts_date ON attendance_alerts(target_date DESC);
CREATE INDEX idx_attendance_alerts_resolved ON attendance_alerts(organization_id, is_resolved);
CREATE INDEX idx_attendance_alerts_type ON attendance_alerts(organization_id, alert_type);

-- RLS Policies
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;

-- Users can view their own alerts
CREATE POLICY "Users can view own alerts"
  ON attendance_alerts FOR SELECT
  USING (auth.uid() = target_user_id);

-- Admins can view all alerts in their organization
CREATE POLICY "Admins can view all alerts"
  ON attendance_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- System can insert alerts (for background jobs)
CREATE POLICY "System can insert alerts"
  ON attendance_alerts FOR INSERT
  WITH CHECK (true);

-- Admins can update alerts (resolve them)
CREATE POLICY "Admins can update alerts"
  ON attendance_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Comment
COMMENT ON TABLE attendance_alerts IS '出退勤アラート・通知管理テーブル';
COMMENT ON COLUMN attendance_alerts.alert_type IS 'アラートタイプ: checkin_reminder, checkout_reminder, qr_expiry_warning, overtime_alert, daily_report';
COMMENT ON COLUMN attendance_alerts.target_user_id IS '対象ユーザー（NULL=全管理者向け）';
COMMENT ON COLUMN attendance_alerts.metadata IS '追加データ（JSON形式）';
