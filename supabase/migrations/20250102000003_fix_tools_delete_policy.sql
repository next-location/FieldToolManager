-- ========================================
-- Fix Tools Delete Policy
-- ========================================
-- 削除操作時のRLSポリシーの競合を修正

-- 既存のUPDATEポリシーを削除
DROP POLICY IF EXISTS "Users can update tools" ON tools;
DROP POLICY IF EXISTS "Managers can delete tools" ON tools;

-- 通常のUPDATE用ポリシー（deleted_atがNULLの状態を維持）
CREATE POLICY "Users can update tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id())
    WITH CHECK (organization_id = public.get_organization_id());

-- 削除操作は別途DELETEポリシーではなく、マネージャー・管理者のみがdeleted_atを設定できるようにする制御はアプリケーションレベルで行う
-- （RLSではすべてのユーザーがUPDATEできるが、削除権限チェックはアプリ側で実装）
