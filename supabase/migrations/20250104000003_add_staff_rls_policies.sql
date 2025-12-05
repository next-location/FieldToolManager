-- Migration: Add RLS policies for staff management
-- Created: 2025-01-04
-- Purpose: Phase 8.1 - Staff Management Feature (Access Control)

-- ============================================
-- users テーブルのRLSポリシー（既存ポリシーに追加）
-- ============================================

-- スタッフ一覧閲覧: 全ロールが自組織のスタッフを閲覧可能
CREATE POLICY "users_select_own_organization"
  ON users FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- スタッフ追加: adminのみ可能
CREATE POLICY "users_insert_admin_only"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = users.organization_id
      AND role = 'admin'
    )
  );

-- スタッフ編集: adminのみ可能
CREATE POLICY "users_update_admin_only"
  ON users FOR UPDATE
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- スタッフ削除（論理削除）: adminのみ可能
CREATE POLICY "users_delete_admin_only"
  ON users FOR DELETE
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- user_history テーブルのRLSポリシー
-- ============================================

-- 変更履歴閲覧: adminのみ可能
CREATE POLICY "user_history_select_admin_only"
  ON user_history FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- 変更履歴作成: adminのみ可能（API経由での記録）
CREATE POLICY "user_history_insert_admin_only"
  ON user_history FOR INSERT
  WITH CHECK (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 変更履歴の更新・削除は不可（監査ログは不変）
-- （デフォルトでポリシーがないため、すべて拒否される）
