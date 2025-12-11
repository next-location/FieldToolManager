-- Add created_by_name column to sales_activities table
-- This allows us to display the name of the person who created the activity

ALTER TABLE sales_activities
ADD COLUMN created_by_name TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sales_activities.created_by_name IS '活動を記録したスーパーアドミンの名前';
