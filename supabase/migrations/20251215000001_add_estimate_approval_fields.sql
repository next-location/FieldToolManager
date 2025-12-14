-- 見積書承認フィールド追加
-- 上司承認機能の実装

-- estimates テーブルに承認関連カラムを追加
ALTER TABLE estimates
ADD COLUMN IF NOT EXISTS manager_approved_by uuid REFERENCES users(id),
ADD COLUMN IF NOT EXISTS manager_approved_at timestamptz,
ADD COLUMN IF NOT EXISTS manager_approval_notes text;

-- コメント追加
COMMENT ON COLUMN estimates.manager_approved_by IS '上司承認者のユーザーID';
COMMENT ON COLUMN estimates.manager_approved_at IS '上司承認日時';
COMMENT ON COLUMN estimates.manager_approval_notes IS '上司承認時のメモ';

-- インデックス追加（承認状態での検索を高速化）
CREATE INDEX IF NOT EXISTS idx_estimates_approved_by ON estimates(manager_approved_by);
CREATE INDEX IF NOT EXISTS idx_estimates_approved_at ON estimates(manager_approved_at);

-- RLSポリシー更新の準備（既存のポリシーは保持）
-- 承認情報の読み取りは organization_id が一致する全ユーザーに許可されます（既存のSELECTポリシーで対応）
