-- ========================================
-- Fix Sites RLS Policy
-- ========================================
-- 問題: "FOR ALL" ポリシーが SELECT を制限していた可能性がある
-- 解決: SELECT ポリシーは全ユーザー、INSERT/UPDATE/DELETE は管理者のみに分離

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Managers can manage sites" ON sites;

-- 管理者のみがINSERT可能
CREATE POLICY "Managers can insert sites"
    ON sites FOR INSERT
    WITH CHECK (
        organization_id = public.get_organization_id() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE organization_id = public.get_organization_id()
            AND id = auth.uid()
            AND role IN ('admin', 'leader')
        )
    );

-- 管理者のみがUPDATE可能
CREATE POLICY "Managers can update sites"
    ON sites FOR UPDATE
    USING (
        organization_id = public.get_organization_id() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE organization_id = public.get_organization_id()
            AND id = auth.uid()
            AND role IN ('admin', 'leader')
        )
    )
    WITH CHECK (
        organization_id = public.get_organization_id()
    );

-- 管理者のみがDELETE可能
CREATE POLICY "Managers can delete sites"
    ON sites FOR DELETE
    USING (
        organization_id = public.get_organization_id() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE organization_id = public.get_organization_id()
            AND id = auth.uid()
            AND role IN ('admin', 'leader')
        )
    );
