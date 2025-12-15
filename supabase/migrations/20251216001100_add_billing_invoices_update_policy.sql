-- billing_invoices テーブルに UPDATE ポリシーを追加
-- 削除（論理削除）機能のために必要

CREATE POLICY "Users can update invoices in their organization"
  ON billing_invoices
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
