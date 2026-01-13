-- Add user_id column to tool_movements table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tool_movements'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE tool_movements ADD COLUMN user_id UUID REFERENCES users(id);

        -- Add index for performance
        CREATE INDEX IF NOT EXISTS idx_tool_movements_user_id ON tool_movements(user_id);

        -- Add comment
        COMMENT ON COLUMN tool_movements.user_id IS '移動実行者のユーザーID';
    END IF;
END $$;
