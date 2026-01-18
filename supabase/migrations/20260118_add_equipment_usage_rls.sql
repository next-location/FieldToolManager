-- ========================================
-- Heavy Equipment Usage Records RLS Policies
-- ========================================

-- RLSを有効化
ALTER TABLE heavy_equipment_usage_records ENABLE ROW LEVEL SECURITY;

-- 全ユーザーが自組織の使用記録を閲覧可能
CREATE POLICY "Users can view organization equipment usage records"
    ON heavy_equipment_usage_records FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM heavy_equipment
            WHERE heavy_equipment.id = heavy_equipment_usage_records.equipment_id
            AND heavy_equipment.organization_id = public.get_organization_id()
        )
    );

-- 全ユーザーが使用記録を作成可能
CREATE POLICY "Users can create equipment usage records"
    ON heavy_equipment_usage_records FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM heavy_equipment
            WHERE heavy_equipment.id = heavy_equipment_usage_records.equipment_id
            AND heavy_equipment.organization_id = public.get_organization_id()
        )
        AND user_id = auth.uid()
    );

-- 使用記録は変更・削除不可（履歴として保持）
-- No UPDATE or DELETE policies
