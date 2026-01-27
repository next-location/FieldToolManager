-- Add break_minutes column to attendance_records table
-- This column stores the user-input break time in minutes
ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS break_minutes INTEGER DEFAULT 0;

-- Add comment
COMMENT ON COLUMN attendance_records.break_minutes IS 'User-input break time in minutes (for manual break recording)';
