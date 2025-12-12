-- invoice_schedulesテーブルにreminder_sentフラグを追加
-- リマインダーメール送信の重複防止のため

ALTER TABLE invoice_schedules
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN invoice_schedules.reminder_sent IS '請求書発行前リマインダーメール送信済みフラグ（3日前に送信）';

-- next_invoice_dateが更新されたらreminder_sentをリセットする関数
CREATE OR REPLACE FUNCTION reset_reminder_sent_on_date_change()
RETURNS TRIGGER AS $$
BEGIN
  -- next_invoice_dateが変更された場合、reminder_sentをfalseにリセット
  IF OLD.next_invoice_date IS DISTINCT FROM NEW.next_invoice_date THEN
    NEW.reminder_sent := false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガーを作成
DROP TRIGGER IF EXISTS reset_reminder_sent_trigger ON invoice_schedules;
CREATE TRIGGER reset_reminder_sent_trigger
  BEFORE UPDATE ON invoice_schedules
  FOR EACH ROW
  EXECUTE FUNCTION reset_reminder_sent_on_date_change();

COMMENT ON FUNCTION reset_reminder_sent_on_date_change() IS 'next_invoice_dateが変更されたらreminder_sentをfalseにリセット';
COMMENT ON TRIGGER reset_reminder_sent_trigger ON invoice_schedules IS 'next_invoice_date変更時にreminder_sentをリセット';
