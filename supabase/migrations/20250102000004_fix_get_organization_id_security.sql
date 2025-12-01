-- ========================================
-- Fix get_organization_id() SECURITY Context
-- ========================================
-- SECURITY DEFINERではなくSECURITY INVOKERに変更して、
-- 呼び出し元のユーザーコンテキストでauth.uid()が取得できるようにする

-- CREATE OR REPLACEを使用（依存関係があってもエラーにならない）
CREATE OR REPLACE FUNCTION public.get_organization_id()
RETURNS UUID AS $$
DECLARE
    org_id UUID;
BEGIN
    -- usersテーブルから現在のユーザーの組織IDを取得
    SELECT organization_id INTO org_id
    FROM public.users
    WHERE id = auth.uid();

    RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;  -- SECURITY INVOKERに変更
