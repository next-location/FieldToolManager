-- 見積もり機能追加: invoicesテーブルにステータス追加
-- 実行日: 2025-01-06
-- 作成者: Claude (via System Admin)
-- 目的: 見積もり生成・送信・却下・請求書変換のフローをサポート

-- ========================================
-- 1. ステータス制約の変更
-- ========================================

-- 既存の制約を削除
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- 新しい制約を追加（見積もりステータス含む）
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN (
    'estimate',        -- 見積もり（未送信）
    'estimate_sent',   -- 見積もり送信済み
    'rejected',        -- 見積もり却下（再見積もり必要）
    'sent',            -- 請求書送付済み（既存）
    'paid',            -- 支払済み（既存）
    'overdue',         -- 期限超過（既存）
    'cancelled'        -- キャンセル（既存）
  ));

-- ========================================
-- 2. 新規カラム追加
-- ========================================

-- 見積もり/請求書の区別用カラム
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'invoice';

-- 見積もり→請求書の変換履歴
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS converted_from_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- ========================================
-- 3. インデックス追加
-- ========================================

-- ステータス検索の高速化
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- 文書タイプ検索の高速化
CREATE INDEX IF NOT EXISTS idx_invoices_document_type ON invoices(document_type);

-- 変換元の見積もり検索の高速化
CREATE INDEX IF NOT EXISTS idx_invoices_converted_from ON invoices(converted_from_invoice_id) WHERE converted_from_invoice_id IS NOT NULL;

-- ========================================
-- 4. コメント追加
-- ========================================

COMMENT ON COLUMN invoices.status IS 'Invoice/Estimate status:
  estimate: 見積もり（未送信）
  estimate_sent: 見積もり送信済み
  rejected: 見積もり却下（再見積もり必要）
  sent: 請求書送付済み
  paid: 支払済み
  overdue: 期限超過
  cancelled: キャンセル';

COMMENT ON COLUMN invoices.document_type IS 'Document type: estimate (見積もり) or invoice (請求書)';

COMMENT ON COLUMN invoices.converted_from_invoice_id IS 'Original estimate ID if this invoice was converted from an estimate';

-- ========================================
-- 5. 既存データの整合性確認
-- ========================================

-- 既存の請求書は全て document_type = 'invoice' に設定
UPDATE invoices SET document_type = 'invoice' WHERE document_type IS NULL;

-- 確認: 既存データのステータスが新しい制約に適合しているか
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM invoices
    WHERE status NOT IN ('estimate', 'estimate_sent', 'rejected', 'sent', 'paid', 'overdue', 'cancelled')
  ) THEN
    RAISE EXCEPTION '既存データに新しい制約に適合しないステータスが存在します';
  END IF;
END $$;
