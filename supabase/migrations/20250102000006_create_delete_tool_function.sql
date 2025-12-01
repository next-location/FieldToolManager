-- ========================================
-- Create delete_tool stored procedure
-- ========================================
-- RLSポリシーを回避するため、SECURITY DEFINERで削除専用関数を作成

CREATE OR REPLACE FUNCTION public.delete_tool(tool_id UUID)
RETURNS JSON AS $$
DECLARE
    user_org_id UUID;
    tool_org_id UUID;
    result JSON;
BEGIN
    -- 現在のユーザーの組織IDを取得
    SELECT organization_id INTO user_org_id
    FROM public.users
    WHERE id = auth.uid();

    IF user_org_id IS NULL THEN
        RETURN json_build_object('error', 'ユーザーの組織が見つかりません');
    END IF;

    -- 削除対象の道具の組織IDを取得
    SELECT organization_id INTO tool_org_id
    FROM public.tools
    WHERE id = tool_id AND deleted_at IS NULL;

    IF tool_org_id IS NULL THEN
        RETURN json_build_object('error', '道具が見つかりません');
    END IF;

    -- 組織が一致するかチェック
    IF user_org_id != tool_org_id THEN
        RETURN json_build_object('error', '権限がありません');
    END IF;

    -- 論理削除を実行
    UPDATE public.tools
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE id = tool_id;

    RETURN json_build_object('success', true, 'id', tool_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
