-- 見積書に submitted ステータスを追加
-- submitted = 上司承認待ち（編集不可、承認可能）

-- 既存の制約を削除
ALTER TABLE estimates DROP CONSTRAINT IF EXISTS estimates_status_check;

-- 新しい制約を追加（submitted を含む）
ALTER TABLE estimates ADD CONSTRAINT estimates_status_check
CHECK (status = ANY (ARRAY['draft'::text, 'submitted'::text, 'sent'::text, 'accepted'::text, 'rejected'::text, 'expired'::text]));

-- コメント
COMMENT ON CONSTRAINT estimates_status_check ON estimates IS '見積書ステータス: draft(下書き), submitted(提出済み・承認待ち), sent(顧客送付済み), accepted(顧客承認), rejected(顧客却下), expired(期限切れ)';
