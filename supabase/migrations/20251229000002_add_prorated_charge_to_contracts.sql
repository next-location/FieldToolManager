-- プラン変更時の日割り差額を記録するカラムを追加
-- 月払いグレードアップ時に翌月請求に加算する差額を保存

-- カラム追加
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS pending_prorated_charge DECIMAL(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_prorated_description TEXT,
ADD COLUMN IF NOT EXISTS plan_change_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan_change_type TEXT CHECK (plan_change_type IN ('upgrade', 'downgrade'));

-- コメント追加
COMMENT ON COLUMN contracts.pending_prorated_charge IS '次回請求に加算する日割り差額（グレードアップ時のみ、請求書発行後に0にクリア）';
COMMENT ON COLUMN contracts.pending_prorated_description IS '日割り差額の説明（請求書明細に表示、例: "プラン変更差額（12/16-31、16日分）"）';
COMMENT ON COLUMN contracts.plan_change_date IS 'プラン変更実行日時（最後にプラン変更した日時）';
COMMENT ON COLUMN contracts.plan_change_type IS 'プラン変更の種類（upgrade: グレードアップ、downgrade: グレードダウン）';

-- インデックス追加（日割り差額が設定されている契約を高速検索）
CREATE INDEX IF NOT EXISTS idx_contracts_pending_prorated
ON contracts(pending_prorated_charge)
WHERE pending_prorated_charge > 0;

-- インデックス追加（プラン変更履歴の検索用）
CREATE INDEX IF NOT EXISTS idx_contracts_plan_change_date
ON contracts(plan_change_date DESC)
WHERE plan_change_date IS NOT NULL;
