-- ========================================
-- Simplify Tools Update Policy
-- ========================================
-- WITH CHECKを削除して、USINGのみでチェック
-- UPDATE操作では既存の行（USING）のみチェックし、更新後の行はチェックしない

DROP POLICY IF EXISTS "Users can update tools" ON tools;

-- UPDATEポリシー: 自組織の道具のみ更新可能（WITH CHECK句なし）
CREATE POLICY "Users can update tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id());
