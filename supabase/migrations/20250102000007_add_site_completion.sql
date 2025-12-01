-- ========================================
-- Add site completion tracking
-- ========================================
-- 現場の完了日を記録するフィールドを追加

ALTER TABLE sites
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- 完了日にインデックスを追加（検索性能向上）
CREATE INDEX idx_sites_completed ON sites(completed_at);

-- is_activeの意味を明確化するコメント
COMMENT ON COLUMN sites.is_active IS '稼働中フラグ: true=稼働中, false=完了/停止';
COMMENT ON COLUMN sites.completed_at IS '工事完了日: 工事が完了した日時を記録';
COMMENT ON COLUMN sites.deleted_at IS '削除日: 論理削除された日時（NULL=未削除）';

-- 完了済み現場を簡単に取得するためのビュー（オプション）
CREATE OR REPLACE VIEW sites_active AS
SELECT * FROM sites
WHERE deleted_at IS NULL AND is_active = true;

CREATE OR REPLACE VIEW sites_completed AS
SELECT * FROM sites
WHERE deleted_at IS NULL AND is_active = false AND completed_at IS NOT NULL;

COMMENT ON VIEW sites_active IS '稼働中の現場一覧';
COMMENT ON VIEW sites_completed IS '完了した現場一覧';
