-- purchase_order_historyテーブルを請求書と同じ構造に更新

-- organization_idカラムを追加
ALTER TABLE purchase_order_history ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 既存データにorganization_idを設定
UPDATE purchase_order_history
SET organization_id = (
  SELECT organization_id FROM purchase_orders WHERE id = purchase_order_history.purchase_order_id
)
WHERE organization_id IS NULL;

-- organization_idをNOT NULLに変更
ALTER TABLE purchase_order_history ALTER COLUMN organization_id SET NOT NULL;

-- action_typeカラムを追加（既存のactionカラムから移行）
ALTER TABLE purchase_order_history ADD COLUMN IF NOT EXISTS action_type TEXT;

-- 既存のactionデータをaction_typeに移行
UPDATE purchase_order_history
SET action_type = CASE
  WHEN action = 'created' THEN 'created'
  WHEN action = 'draft_saved' THEN 'draft_saved'
  WHEN action = 'submitted' THEN 'submitted'
  WHEN action = 'approved' THEN 'approved'
  WHEN action = 'rejected' THEN 'rejected'
  WHEN action = 'ordered' THEN 'ordered'
  WHEN action = 'received' THEN 'received'
  WHEN action = 'paid' THEN 'paid'
  ELSE action
END
WHERE action_type IS NULL;

-- action_typeをNOT NULLに変更
ALTER TABLE purchase_order_history ALTER COLUMN action_type SET NOT NULL;

-- performed_byカラムを追加（created_byから移行）
ALTER TABLE purchase_order_history ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES users(id);

-- 既存データをコピー
UPDATE purchase_order_history
SET performed_by = created_by
WHERE performed_by IS NULL;

-- performed_byをNOT NULLに変更
ALTER TABLE purchase_order_history ALTER COLUMN performed_by SET NOT NULL;

-- performed_by_nameカラムを追加
ALTER TABLE purchase_order_history ADD COLUMN IF NOT EXISTS performed_by_name TEXT;

-- 既存データにユーザー名を設定
UPDATE purchase_order_history
SET performed_by_name = (
  SELECT name FROM users WHERE id = purchase_order_history.performed_by
)
WHERE performed_by_name IS NULL;

-- performed_by_nameをNOT NULLに変更
ALTER TABLE purchase_order_history ALTER COLUMN performed_by_name SET NOT NULL;

-- notesカラムを追加（commentから移行）
ALTER TABLE purchase_order_history ADD COLUMN IF NOT EXISTS notes TEXT;

-- 既存のcommentデータをnotesに移行
UPDATE purchase_order_history
SET notes = comment
WHERE notes IS NULL AND comment IS NOT NULL;

-- 古いカラムを削除（データ移行後）
-- action, old_status, new_status, comment, created_byは互換性のため残す

-- インデックス追加
CREATE INDEX IF NOT EXISTS idx_purchase_order_history_organization_id ON purchase_order_history(organization_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_history_performed_by ON purchase_order_history(performed_by);
CREATE INDEX IF NOT EXISTS idx_purchase_order_history_action_type ON purchase_order_history(action_type);

-- RLSポリシーを更新
DROP POLICY IF EXISTS "Users can view purchase order history" ON purchase_order_history;
DROP POLICY IF EXISTS "Users can insert purchase order history" ON purchase_order_history;

CREATE POLICY "Users can view purchase order history"
  ON purchase_order_history
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert purchase order history"
  ON purchase_order_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND performed_by = auth.uid()
  );

-- コメント追加
COMMENT ON COLUMN purchase_order_history.organization_id IS '組織ID';
COMMENT ON COLUMN purchase_order_history.action_type IS '操作種別（created, draft_saved, submitted, approved, rejected, ordered, received, paid, pdf_generated）';
COMMENT ON COLUMN purchase_order_history.performed_by IS '操作実行ユーザーID';
COMMENT ON COLUMN purchase_order_history.performed_by_name IS '操作実行ユーザー名';
COMMENT ON COLUMN purchase_order_history.notes IS '操作メモ・理由';
