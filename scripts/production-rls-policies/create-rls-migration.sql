-- =========================================
-- Production RLS Policies Migration
-- Generated: 2025-12-22
-- =========================================

-- このファイルは本番環境に既存のテーブルに対してRLSポリシーを追加します
-- 前提条件：全テーブルでRLSが既に有効化されていること

-- =========================================
-- Helper Functions（既存の場合はスキップ）
-- =========================================

-- organization_idを取得する関数
CREATE OR REPLACE FUNCTION auth.user_organization_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT organization_id FROM users WHERE id = auth.uid();
$$;

-- Super Admin判定関数
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM super_admins
    WHERE id = auth.uid() AND is_active = true
  );
$$;

-- =========================================
-- Organizations Table Policies
-- =========================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "organizations_select" ON organizations;
DROP POLICY IF EXISTS "organizations_insert" ON organizations;
DROP POLICY IF EXISTS "organizations_update" ON organizations;
DROP POLICY IF EXISTS "organizations_delete" ON organizations;

-- Super admins can do everything
CREATE POLICY "organizations_select" ON organizations
  FOR SELECT USING (auth.is_super_admin());

CREATE POLICY "organizations_insert" ON organizations
  FOR INSERT WITH CHECK (auth.is_super_admin());

CREATE POLICY "organizations_update" ON organizations
  FOR UPDATE USING (auth.is_super_admin());

CREATE POLICY "organizations_delete" ON organizations
  FOR DELETE USING (auth.is_super_admin());

