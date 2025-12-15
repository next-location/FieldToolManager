-- notificationsテーブルに見積もり用のカラムとタイプを追加

-- 通知先ユーザーIDカラムを追加
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id);

-- 見積もり関連のカラムを追加
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_estimate_id UUID REFERENCES estimates(id);

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_notifications_target_user_id ON notifications(target_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_related_estimate_id ON notifications(related_estimate_id);

-- typeの制約を削除して再作成（見積もり用のタイプを追加）
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
CHECK (type = ANY (ARRAY[
  'low_stock'::text,
  'unreturned_tool'::text,
  'monthly_inventory'::text,
  'maintenance_due'::text,
  'tool_created'::text,
  'tool_updated'::text,
  'tool_deleted'::text,
  'user_invited'::text,
  'contract_expiring'::text,
  'system_announcement'::text,
  'work_report_submitted'::text,
  'work_report_approved'::text,
  'work_report_rejected'::text,
  'estimate_approved'::text,
  'estimate_returned'::text,
  'estimate_customer_approved'::text,
  'estimate_customer_rejected'::text
]));

-- RLSポリシーを更新（target_user_idでフィルタリング）
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    (organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND deleted_at IS NULL)
    OR
    (target_user_id = auth.uid() AND deleted_at IS NULL)
  );

-- コメント追加
COMMENT ON COLUMN notifications.target_user_id IS '通知先ユーザーID（見積もり承認通知など個人宛て通知用）';
COMMENT ON COLUMN notifications.related_estimate_id IS '関連見積もりID';
