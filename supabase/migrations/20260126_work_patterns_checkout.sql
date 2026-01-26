-- 勤務パターンに退勤予定時刻と退勤アラート設定を追加
-- Phase 2拡張: 退勤打刻忘れアラート対応

-- 退勤予定時刻を追加
ALTER TABLE work_patterns
ADD COLUMN IF NOT EXISTS expected_checkout_time TIME;

-- 退勤アラート有効/無効フラグを追加
ALTER TABLE work_patterns
ADD COLUMN IF NOT EXISTS checkout_alert_enabled BOOLEAN DEFAULT false;

-- 退勤アラート時間（退勤予定時刻から何時間後にアラートするか）
ALTER TABLE work_patterns
ADD COLUMN IF NOT EXISTS checkout_alert_hours_after DECIMAL(3,1) DEFAULT 1.0;

-- コメント追加
COMMENT ON COLUMN work_patterns.expected_checkout_time IS '退勤予定時刻（HH:MM:SS形式）';
COMMENT ON COLUMN work_patterns.checkout_alert_enabled IS '退勤打刻忘れアラートを有効にするか';
COMMENT ON COLUMN work_patterns.checkout_alert_hours_after IS '退勤予定時刻から何時間後にアラートを送信するか（0.5〜3.0時間）';
