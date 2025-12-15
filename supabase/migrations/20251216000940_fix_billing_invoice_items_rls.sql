-- billing_invoice_items テーブルの RLS ポリシー追加
-- INSERT/UPDATE/DELETE 操作のポリシーが不足していたため追加

-- INSERT ポリシー
CREATE POLICY "Users can insert invoice items in their organization"
  ON billing_invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- UPDATE ポリシー
CREATE POLICY "Users can update invoice items in their organization"
  ON billing_invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- DELETE ポリシー
CREATE POLICY "Users can delete invoice items in their organization"
  ON billing_invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );
