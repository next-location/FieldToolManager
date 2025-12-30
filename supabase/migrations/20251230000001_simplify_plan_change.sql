-- プラン変更を30日前申請・次回請求日切り替えに統一
-- 日割り計算を廃止し、シンプルな仕様に変更

-- 1. 日割り関連カラムを削除
ALTER TABLE contracts
DROP COLUMN IF EXISTS pending_prorated_charge,
DROP COLUMN IF EXISTS pending_prorated_description;

-- 2. 新しいプラン変更管理カラムを追加
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS pending_plan_change JSONB,
ADD COLUMN IF NOT EXISTS plan_change_requested_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS plan_change_grace_deadline TIMESTAMP;

-- 3. コメント追加
COMMENT ON COLUMN contracts.pending_plan_change IS
'プラン変更予約データ（例: {"new_plan": "start", "new_user_limit": 10, "new_package_ids": ["pkg-id"], "effective_date": "2025-01-01", "old_plan": "standard", "old_user_limit": 30})';

COMMENT ON COLUMN contracts.plan_change_requested_at IS
'プラン変更申請日時（30日前チェック用）';

COMMENT ON COLUMN contracts.plan_change_grace_deadline IS
'ダウングレード時のユーザー削減猶予期限（プラン切り替え日+3日）。この日にユーザー数超過なら自動無効化';

-- 4. インデックス削除（不要になったカラム用）
DROP INDEX IF EXISTS idx_contracts_pending_prorated;

-- 5. 新しいインデックス追加
CREATE INDEX IF NOT EXISTS idx_contracts_pending_plan_change
ON contracts(plan_change_requested_at)
WHERE pending_plan_change IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_grace_deadline
ON contracts(plan_change_grace_deadline)
WHERE plan_change_grace_deadline IS NOT NULL;
