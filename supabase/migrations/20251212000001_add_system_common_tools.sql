-- システム共通道具マスタ機能の追加
-- is_system_common カラムを追加して、全組織共通の道具マスタを管理可能にする

-- 1. is_system_common カラムを追加
ALTER TABLE tools
ADD COLUMN is_system_common BOOLEAN DEFAULT false NOT NULL;

-- 2. organization_id を NULL 許可に変更（共通道具用）
ALTER TABLE tools
ALTER COLUMN organization_id DROP NOT NULL;

-- 3. インデックス追加（共通道具の検索を高速化）
CREATE INDEX idx_tools_is_system_common ON tools(is_system_common)
WHERE is_system_common = true AND deleted_at IS NULL;

-- 4. 制約追加：共通道具の場合 organization_id は NULL 必須
ALTER TABLE tools
ADD CONSTRAINT tools_system_common_check
CHECK (
  (is_system_common = false AND organization_id IS NOT NULL) OR
  (is_system_common = true AND organization_id IS NULL)
);

-- 5. カラムにコメント追加
COMMENT ON COLUMN tools.is_system_common IS 'システム共通道具フラグ（true=全組織共通でスーパー管理者が管理、false=組織固有）';

-- 6. 既存の RLS ポリシーを削除
DROP POLICY IF EXISTS "Users can view organization tools" ON tools;
DROP POLICY IF EXISTS "Users can insert tools" ON tools;
DROP POLICY IF EXISTS "Users can update tools" ON tools;

-- 7. 新しい RLS ポリシーを作成（共通道具も閲覧可能に）

-- SELECT: 自組織の道具 + システム共通道具を閲覧可能
CREATE POLICY "Users can view tools" ON tools
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    -- 自組織の道具
    (is_system_common = false AND organization_id = get_organization_id()) OR
    -- システム共通道具（全組織から閲覧可能）
    (is_system_common = true AND organization_id IS NULL)
  )
);

-- INSERT: 一般ユーザーは組織固有道具のみ作成可能
CREATE POLICY "Users can insert organization tools" ON tools
FOR INSERT
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- UPDATE: 一般ユーザーは自組織の道具のみ更新可能（共通道具は更新不可）
CREATE POLICY "Users can update organization tools" ON tools
FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- DELETE: 一般ユーザーは自組織の道具のみ削除可能（共通道具は削除不可）
CREATE POLICY "Users can delete organization tools" ON tools
FOR DELETE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- 8. 既存データの整合性確保（全て組織固有道具として扱う）
UPDATE tools
SET is_system_common = false
WHERE is_system_common IS NULL;

-- 9. マイグレーション完了確認用のコメント
COMMENT ON TABLE tools IS 'Updated: Added system common tools support (2025-12-12)';
