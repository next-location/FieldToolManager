-- ========================================
-- Fix get_organization_id function
-- JWTではなくusersテーブルから組織IDを取得
-- ========================================

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
$$ LANGUAGE plpgsql SECURITY DEFINER;
