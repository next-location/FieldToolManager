-- 監査ログテーブルの作成
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- アクション情報
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'view', 'login', 'logout', 'export')),
  table_name TEXT NOT NULL,
  record_id UUID,

  -- 変更内容
  old_value JSONB,
  new_value JSONB,

  -- 実行者情報
  user_id UUID REFERENCES users(id),
  user_email TEXT,
  user_role TEXT,

  -- アクセス情報
  ip_address TEXT,
  user_agent TEXT,

  -- 追加情報
  reason TEXT, -- アクセス理由（管理者による顧客データアクセス時など）
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX idx_audit_logs_organization_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- RLS有効化
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 管理者のみ自組織の監査ログを閲覧可能
CREATE POLICY "Admins can view their organization audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- 監査ログへの書き込みはシステムのみ（アプリケーションから直接INSERT）
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE audit_logs IS '監査ログ: 全ての重要な操作を記録';
COMMENT ON COLUMN audit_logs.action IS '操作の種類';
COMMENT ON COLUMN audit_logs.table_name IS '対象テーブル名';
COMMENT ON COLUMN audit_logs.record_id IS '対象レコードのID';
COMMENT ON COLUMN audit_logs.old_value IS '変更前の値（JSON）';
COMMENT ON COLUMN audit_logs.new_value IS '変更後の値（JSON）';
COMMENT ON COLUMN audit_logs.reason IS 'アクセス理由（管理者アクセス時など）';

---

-- 通知履歴テーブルの作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 通知内容
  type TEXT NOT NULL CHECK (type IN (
    'low_stock',           -- 低在庫アラート
    'unreturned_tool',     -- 道具未返却
    'monthly_inventory',   -- 月次棚卸しリマインダー
    'maintenance_due',     -- 保守期限
    'tool_created',        -- 道具登録
    'tool_updated',        -- 道具更新
    'tool_deleted',        -- 道具削除
    'user_invited',        -- ユーザー招待
    'contract_expiring',   -- 契約期限
    'system_announcement'  -- システムお知らせ
  )),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'success')),

  -- 関連データ
  related_tool_id UUID REFERENCES tools(id),
  related_user_id UUID REFERENCES users(id),
  related_site_id UUID REFERENCES locations(id),
  metadata JSONB DEFAULT '{}',

  -- ステータス
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  read_by UUID REFERENCES users(id),

  -- 送信情報
  sent_via TEXT[] DEFAULT ARRAY['in_app'], -- 'in_app', 'email', 'slack'
  sent_at TIMESTAMP DEFAULT NOW(),

  -- タイムスタンプ
  created_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

-- インデックス作成
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_severity ON notifications(severity);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_related_tool_id ON notifications(related_tool_id);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_deleted_at ON notifications(deleted_at) WHERE deleted_at IS NULL;

-- RLS有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー: 自組織の通知を閲覧可能
CREATE POLICY "Users can view their organization notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- RLSポリシー: 自組織の通知を更新可能（既読化など）
CREATE POLICY "Users can update their organization notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- RLSポリシー: システムが通知を作成可能
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE notifications IS '通知履歴: アプリ内通知・メール通知の記録';
COMMENT ON COLUMN notifications.type IS '通知の種類';
COMMENT ON COLUMN notifications.severity IS '重要度（info/warning/error/success）';
COMMENT ON COLUMN notifications.sent_via IS '送信チャネル（アプリ内/メール/Slack）';
COMMENT ON COLUMN notifications.is_read IS '既読フラグ';
