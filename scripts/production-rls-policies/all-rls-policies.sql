-- =========================================
-- RLS Policies for Production Environment
-- Generated: Mon Dec 22 20:08:43 JST 2025
-- =========================================

-- =========================================
-- From: 20250102000000_create_rls_policies.sql
-- =========================================
CREATE POLICY "Users can view own organization"
    ON organizations FOR SELECT
    USING (id = public.get_organization_id());

-- Only system admins can insert organizations (handled at application level)
CREATE POLICY "System admins can insert organizations"
    ON organizations FOR INSERT
    WITH CHECK (false); -- Will be handled by service role

-- Organization admins can update their organization
CREATE POLICY "Organization admins can update own organization"
    ON organizations FOR UPDATE
    USING (id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = organizations.id
                   AND id = auth.uid() AND role = 'admin'));

-- ========================================
-- Users Policies
-- ========================================
-- Users can view users in their organization
CREATE POLICY "Users can view organization users"
    ON users FOR SELECT
    USING (organization_id = public.get_organization_id());

-- Only organization admins can insert users
CREATE POLICY "Organization admins can insert users"
    ON users FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id() AND
                EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                        AND id = auth.uid() AND role = 'admin'));

-- Organization admins can update users
CREATE POLICY "Organization admins can update users"
    ON users FOR UPDATE
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND organization_id = public.get_organization_id());

-- ========================================
-- Tool Categories Policies
-- ========================================
-- All users can view categories in their organization
CREATE POLICY "Users can view organization categories"
    ON tool_categories FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- Managers and admins can manage categories
CREATE POLICY "Managers can manage categories"
    ON tool_categories FOR ALL
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')));

-- ========================================
-- Tools Policies
-- ========================================
-- All users can view tools in their organization
CREATE POLICY "Users can view organization tools"
    ON tools FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- All users can insert tools (for check-in/out)
CREATE POLICY "Users can insert tools"
    ON tools FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id());

-- All users can update tools (for movements)
CREATE POLICY "Users can update tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- Only managers and admins can soft delete tools
CREATE POLICY "Managers can delete tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')))
    WITH CHECK (organization_id = public.get_organization_id() AND deleted_at IS NOT NULL);

-- ========================================
-- Sites Policies
-- ========================================
-- All users can view sites in their organization
CREATE POLICY "Users can view organization sites"
    ON sites FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- Managers and admins can manage sites
CREATE POLICY "Managers can manage sites"
    ON sites FOR ALL
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')));

-- ========================================
-- Tool Movements Policies
-- ========================================
-- All users can view movements in their organization
CREATE POLICY "Users can view organization movements"
    ON tool_movements FOR SELECT
    USING (organization_id = public.get_organization_id());

-- All users can create movements
CREATE POLICY "Users can create movements"
    ON tool_movements FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id() AND performed_by = auth.uid());

-- Movements cannot be updated or deleted (immutable history)
-- No UPDATE or DELETE policies

-- ========================================
-- Contracts Policies
-- ========================================
-- Only admins can view contracts
CREATE POLICY "Admins can view contracts"
    ON contracts FOR SELECT
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Only system can manage contracts (via service role)
CREATE POLICY "System manages contracts"
    ON contracts FOR ALL
    USING (false)
    WITH CHECK (false);

-- ========================================
-- Invoices Policies
-- ========================================
-- Admins can view invoices
CREATE POLICY "Admins can view invoices"
    ON invoices FOR SELECT
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Only system can manage invoices (via service role)
CREATE POLICY "System manages invoices"
    ON invoices FOR ALL
    USING (false)
    WITH CHECK (false);

-- ========================================
-- Payment Records Policies
-- ========================================
-- Admins can view payment records
CREATE POLICY "Admins can view payment records"
    ON payment_records FOR SELECT
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role = 'admin'));

-- Only system can manage payment records (via service role)
CREATE POLICY "System manages payment records"
    ON payment_records FOR ALL
    USING (false)
    WITH CHECK (false);

-- ========================================
-- Audit Logs Policies
-- ========================================
-- Users can view audit logs for their organization
CREATE POLICY "Users can view organization audit logs"
    ON audit_logs FOR SELECT
    USING (organization_id = public.get_organization_id());

-- Only system can insert audit logs
CREATE POLICY "System inserts audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (organization_id = public.get_organization_id());

-- Audit logs are immutable (no update or delete)
-- No UPDATE or DELETE policies

-- =========================================
-- From: 20250102000001_simplify_rls.sql
-- =========================================
DROP POLICY IF EXISTS "Users can view organization users" ON users;
DROP POLICY IF EXISTS "Organization admins can insert users" ON users;
DROP POLICY IF EXISTS "Organization admins can update users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- 認証済みユーザーは自分のレコードを読み取れる
CREATE POLICY "Users can view own record"
    ON users FOR SELECT
    USING (id = auth.uid());

-- 認証済みユーザーは自分のレコードを更新できる
CREATE POLICY "Users can update own record"
    ON users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- =========================================
-- From: 20250102000003_fix_tools_delete_policy.sql
-- =========================================
DROP POLICY IF EXISTS "Users can update tools" ON tools;
DROP POLICY IF EXISTS "Managers can delete tools" ON tools;

-- 通常のUPDATE用ポリシー（deleted_atがNULLの状態を維持）
CREATE POLICY "Users can update tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id())
    WITH CHECK (organization_id = public.get_organization_id());

-- 削除操作は別途DELETEポリシーではなく、マネージャー・管理者のみがdeleted_atを設定できるようにする制御はアプリケーションレベルで行う
-- （RLSではすべてのユーザーがUPDATEできるが、削除権限チェックはアプリ側で実装）

-- =========================================
-- From: 20250102000005_simplify_tools_update_policy.sql
-- =========================================
DROP POLICY IF EXISTS "Users can update tools" ON tools;

-- UPDATEポリシー: 自組織の道具のみ更新可能（WITH CHECK句なし）
CREATE POLICY "Users can update tools"
    ON tools FOR UPDATE
    USING (organization_id = public.get_organization_id());

-- =========================================
-- From: 20250102000009_create_tool_sets.sql
-- =========================================
CREATE POLICY "Users can view organization tool sets"
    ON tool_sets FOR SELECT
    USING (organization_id = public.get_organization_id() AND deleted_at IS NULL);

-- 道具セット: 管理者とマネージャーは作成・更新・削除可能
CREATE POLICY "Managers can manage tool sets"
    ON tool_sets FOR ALL
    USING (organization_id = public.get_organization_id() AND
           EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                   AND id = auth.uid() AND role IN ('admin', 'manager')));

-- 道具セットアイテム: 組織内のユーザーは閲覧可能
CREATE POLICY "Users can view organization tool set items"
    ON tool_set_items FOR SELECT
    USING (EXISTS (SELECT 1 FROM tool_sets WHERE id = tool_set_items.tool_set_id
                   AND organization_id = public.get_organization_id() AND deleted_at IS NULL));

-- 道具セットアイテム: 管理者とマネージャーは作成・更新・削除可能
CREATE POLICY "Managers can manage tool set items"
    ON tool_set_items FOR ALL
    USING (EXISTS (SELECT 1 FROM tool_sets
                   WHERE id = tool_set_items.tool_set_id
                   AND organization_id = public.get_organization_id()
                   AND EXISTS (SELECT 1 FROM users WHERE organization_id = public.get_organization_id()
                               AND id = auth.uid() AND role IN ('admin', 'manager'))));

-- =========================================
-- From: 20250102000010_create_tool_items.sql
-- =========================================
CREATE POLICY "Users can view tool items in their organization"
    ON tool_items FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
        )
    );

-- INSERT: 同じ組織のadmin/managerが作成可能
CREATE POLICY "Admins and managers can create tool items"
    ON tool_items FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- UPDATE: 同じ組織のadmin/managerが更新可能
CREATE POLICY "Admins and managers can update tool items"
    ON tool_items FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'manager')
        )
    );

-- DELETE: 削除は stored procedure 経由のみ（論理削除）
CREATE POLICY "No direct deletes on tool items"
    ON tool_items FOR DELETE
    USING (false);

-- Step 9: 論理削除用のストアドプロシージャ
CREATE OR REPLACE FUNCTION delete_tool_item(item_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE

-- =========================================
-- From: 20250102000019_create_notifications.sql
-- =========================================
CREATE POLICY "Users can view their organization notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- RLSポリシー: 自組織の通知を更新可能（既読化など）
CREATE POLICY "Users can update their organization notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
--
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

COMMENT ON TABLE notifications IS '通知履歴: アプリ内通知・メール通知の記録';
COMMENT ON COLUMN notifications.type IS '通知の種類';
COMMENT ON COLUMN notifications.severity IS '重要度（info/warning/error/success）';
COMMENT ON COLUMN notifications.sent_via IS '送信チャネル（アプリ内/メール/Slack）';
COMMENT ON COLUMN notifications.is_read IS '既読フラグ';

-- =========================================
-- From: 20250104000003_add_staff_rls_policies.sql
-- =========================================
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

--
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
--
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
--
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
--
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

-- =========================================
-- From: 20250104000004_create_attendance_management.sql
-- =========================================
CREATE POLICY "Organizations can manage their own settings"
  ON organization_attendance_settings
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 2. site_attendance_settings
ALTER TABLE site_attendance_settings ENABLE ROW LEVEL SECURITY;
--
CREATE POLICY "Users can view their organization's site settings"
  ON site_attendance_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage site settings"
  ON site_attendance_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- 3. office_qr_codes
--
CREATE POLICY "Users can view their organization's QR codes"
  ON office_qr_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage QR codes"
  ON office_qr_codes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- 4. attendance_records
--
CREATE POLICY "Users can view own attendance records"
  ON attendance_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance records"
  ON attendance_records FOR UPDATE
  USING (auth.uid() = user_id AND is_manually_edited = false);

CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage all attendance records"
  ON attendance_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- =========================================
-- From: 20250104000005_create_site_leader_qr_logs.sql
-- =========================================
CREATE POLICY "Users can view their organization's QR logs"
  ON site_leader_qr_logs
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- リーダー・管理者がQRコードを発行できる
CREATE POLICY "Leaders and admins can generate QR codes"
  ON site_leader_qr_logs
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('leader', 'manager', 'admin')
    )
  );

--
CREATE POLICY "Admins can update QR logs"
  ON site_leader_qr_logs
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('manager', 'admin')
    )
  );

-- =========================================
-- From: 20250104_create_consumable_orders.sql
-- =========================================
CREATE POLICY "Users can view consumable orders in their organization"
  ON consumable_orders FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ポリシー: 作成（組織内全ユーザー）
CREATE POLICY "Users can create consumable orders in their organization"
  ON consumable_orders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- ポリシー: 更新（組織内のリーダー・管理者のみ）
CREATE POLICY "Leaders can update consumable orders in their organization"
  ON consumable_orders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'leader')
    )
  );

-- ポリシー: 論理削除（組織内の管理者のみ）
CREATE POLICY "Admins can delete consumable orders in their organization"
  ON consumable_orders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- コメント追加

-- =========================================
-- From: 20250105000000_create_attendance_alerts.sql
-- =========================================
CREATE POLICY "Users can view own alerts"
  ON attendance_alerts FOR SELECT
  USING (auth.uid() = target_user_id);

-- Admins can view all alerts in their organization
CREATE POLICY "Admins can view all alerts"
  ON attendance_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- System can insert alerts (for background jobs)
CREATE POLICY "System can insert alerts"
  ON attendance_alerts FOR INSERT
  WITH CHECK (true);

-- Admins can update alerts (resolve them)
CREATE POLICY "Admins can update alerts"
  ON attendance_alerts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

-- Comment

-- =========================================
-- From: 20250105000001_create_clients.sql
-- =========================================
CREATE POLICY "Leaders can view clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'leader')
    )
  );

-- 作成・更新・削除権限: 管理者のみ
CREATE POLICY "Admin can insert clients" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can update clients" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admin can delete clients" ON clients
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = clients.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

-- コメント追加

-- =========================================
-- From: 20250105000002_fix_users_rls_infinite_loop.sql
-- =========================================
DROP POLICY IF EXISTS "users_select_own_organization" ON users;
DROP POLICY IF EXISTS "Users can view own record" ON users;

-- シンプルなポリシーに置き換え（無限ループしない）
-- 認証済みユーザーは全てのユーザーを閲覧可能（organization_idによるフィルタはアプリケーション層で行う）
CREATE POLICY "users_select_authenticated" ON users
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

COMMENT ON POLICY "users_select_authenticated" ON users IS '認証済みユーザーは全ユーザーを閲覧可能（組織フィルタはアプリ層）';

-- =========================================
-- From: 20250105000003_invoice_management.sql
-- =========================================
CREATE POLICY "Users can view projects in their organization" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin can insert projects" ON projects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = projects.organization_id
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "Admin can update projects" ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = projects.organization_id
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

-- 見積書のRLSポリシー
CREATE POLICY "Users can view estimates in their organization" ON estimates
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Leader can insert estimates" ON estimates
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = estimates.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'leader')
    )
  );

-- 請求書のRLSポリシー
CREATE POLICY "Users can view billing_invoices in their organization" ON billing_invoices
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Leader can insert billing_invoices" ON billing_invoices
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = billing_invoices.organization_id
      AND role IN ('admin', 'super_admin', 'manager', 'leader')
    )
  );

-- 明細テーブルのRLSポリシー（親テーブルを参照）
CREATE POLICY "Users can view estimate items" ON estimate_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM estimates e
      WHERE e.id = estimate_items.estimate_id
      AND e.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view invoice items" ON billing_invoice_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

--
CREATE POLICY "Users can view purchase orders" ON purchase_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- 入出金のRLSポリシー
CREATE POLICY "Admin can view payments" ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = payments.organization_id
      AND role IN ('admin', 'super_admin', 'manager')
    )
  );

CREATE POLICY "Admin can insert payments" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = payments.organization_id
      AND role IN ('admin', 'super_admin')
    )
  );

-- =========================================
-- From: 20250105000020_create_work_reports.sql
-- =========================================
CREATE POLICY "Users can view own organization work reports"
ON work_reports FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 自組織のデータのみ作成可能
CREATE POLICY "Users can create own organization work reports"
ON work_reports FOR INSERT
WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 作成者本人または管理者のみ編集可能（draft状態のみ）
CREATE POLICY "Users can update own draft reports or admins can update all"
ON work_reports FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
  status = 'draft' AND
  (created_by = auth.uid() OR
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'leader')))
);

-- 作成者本人または管理者のみ削除可能
CREATE POLICY "Users can delete own reports or admins can delete all"
ON work_reports FOR DELETE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
  (created_by = auth.uid() OR
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
);

-- work_report_photos のRLS
ALTER TABLE work_report_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization work report photos"
ON work_report_photos FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own organization work report photos"
ON work_report_photos FOR ALL
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- work_report_attachments のRLS
ALTER TABLE work_report_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization work report attachments"
ON work_report_attachments FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can manage own organization work report attachments"
ON work_report_attachments FOR ALL
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- organization_report_settings のRLS
ALTER TABLE organization_report_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization report settings"
ON organization_report_settings FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Only admins can update organization report settings"
ON organization_report_settings FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- ========================================
-- コメント追加
-- ========================================


-- =========================================
-- From: 20250105000021_create_storage_bucket_work_report_photos.sql
-- =========================================
CREATE POLICY "Users can upload work report photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-report-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all photos (bucket is public)
CREATE POLICY "Users can view work report photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-report-photos'
);

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own work report photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-report-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =========================================
-- From: 20250105000022_create_storage_bucket_work_report_attachments.sql
-- =========================================
CREATE POLICY "Users can upload work report attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'work-report-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow authenticated users to view all attachments (bucket is public)
CREATE POLICY "Users can view work report attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'work-report-attachments'
);

-- Allow users to delete their own attachments
CREATE POLICY "Users can delete their own work report attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'work-report-attachments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- =========================================
-- From: 20250105000023_create_work_report_approvals.sql
-- =========================================
CREATE POLICY "Users can view approvals in their organization"
ON work_report_approvals FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id FROM users WHERE id = auth.uid()
  )
);

-- RLSポリシー: leader/admin は承認アクションを作成可能
CREATE POLICY "Leaders and admins can create approvals"
ON work_report_approvals FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);


-- =========================================
-- From: 20250105000025_create_work_report_templates.sql
-- =========================================
CREATE POLICY "Users can view templates in their organization" ON work_report_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 自組織のテンプレート作成
CREATE POLICY "Users can create templates in their organization" ON work_report_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- 自分が作成したテンプレートのみ更新可能
CREATE POLICY "Users can update their own templates" ON work_report_templates
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- 自分が作成したテンプレートのみ削除可能（論理削除）
CREATE POLICY "Users can delete their own templates" ON work_report_templates
  FOR DELETE
  USING (created_by = auth.uid());

-- =========================================
-- From: 20250106000001_add_work_report_fields.sql
-- =========================================
CREATE POLICY "Users can view own organization sequences"
ON work_report_number_sequences FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 自組織のシーケンスのみ作成・更新可能
CREATE POLICY "Users can manage own organization sequences"
ON work_report_number_sequences FOR ALL
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- 更新日時自動更新トリガー
CREATE TRIGGER update_work_report_number_sequences_updated_at
  BEFORE UPDATE ON work_report_number_sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE work_report_number_sequences IS '作業報告書番号の連番管理テーブル';

-- =========================================
-- From: 20250106000003_create_work_report_custom_fields.sql
-- =========================================
CREATE POLICY "Users can view custom fields in their organization"
ON work_report_custom_fields FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage custom fields"
ON work_report_custom_fields FOR ALL
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);

-- ========================================
-- work_reportsテーブルにカスタムフィールドデータ保存カラムを追加
-- ========================================

-- =========================================
-- From: 20250106000004_create_work_report_photos_and_attachments.sql
-- =========================================
CREATE POLICY "Users can view attachments in their organization"
ON work_report_attachments FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert attachments for reports in their organization"
ON work_report_attachments FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND
  work_report_id IN (
    SELECT id FROM work_reports
    WHERE organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  )
);

CREATE POLICY "Users can update attachments for reports in their organization"
ON work_report_attachments FOR UPDATE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can delete attachments for reports in their organization"
ON work_report_attachments FOR DELETE
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- コメント
COMMENT ON TABLE work_report_attachments IS '作業報告書の添付ファイル管理テーブル';
COMMENT ON COLUMN work_report_attachments.file_type IS 'ファイル種別: 図面、仕様書、マニュアル、その他';

-- =========================================
-- From: 20251202000013_create_warehouse_locations.sql
-- =========================================
CREATE POLICY "Users can view their organization's location templates"
  ON warehouse_location_templates FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can manage location templates"
  ON warehouse_location_templates FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- RLS policies for warehouse_locations
CREATE POLICY "Users can view their organization's warehouse locations"
  ON warehouse_locations FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

CREATE POLICY "Admins can manage warehouse locations"
  ON warehouse_locations FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION update_warehouse_location_template_updated_at()

-- =========================================
-- From: 20251202000014_add_consumable_management.sql
-- =========================================
CREATE POLICY "Users can view consumable inventory in their organization"
  ON consumable_inventory FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert consumable inventory in their organization"
  ON consumable_inventory FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update consumable inventory in their organization"
  ON consumable_inventory FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete consumable inventory in their organization"
  ON consumable_inventory FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Auto-update trigger
CREATE TRIGGER update_consumable_inventory_updated_at
  BEFORE UPDATE ON consumable_inventory

-- =========================================
-- From: 20251202000015_create_consumable_movements.sql
-- =========================================
CREATE POLICY "Users can view their organization's consumable movements"
  ON consumable_movements
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- INSERT: 自組織のデータのみ作成可能
CREATE POLICY "Users can create consumable movements for their organization"
  ON consumable_movements
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- コメント
COMMENT ON TABLE consumable_movements IS '消耗品の移動履歴を記録するテーブル';

-- =========================================
-- From: 20251202000016_add_image_to_tools.sql
-- =========================================
-- CREATE POLICY "Users can upload tool images"
-- ON storage.objects FOR INSERT
-- TO authenticated
-- WITH CHECK (
--   bucket_id = 'tool-images' AND
--   auth.uid() IN (
--     SELECT id FROM users WHERE organization_id = (storage.foldername(name))[1]::uuid
--   )
-- );
--
-- CREATE POLICY "Users can view their organization's tool images"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'tool-images' AND
--   auth.uid() IN (
--     SELECT id FROM users WHERE organization_id = (storage.foldername(name))[1]::uuid
--   )
-- );
--
-- CREATE POLICY "Users can delete their organization's tool images"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'tool-images' AND
--   auth.uid() IN (
--     SELECT id FROM users WHERE organization_id = (storage.foldername(name))[1]::uuid
--   )
-- );

-- =========================================
-- From: 20251202000017_create_storage_bucket.sql
-- =========================================
CREATE POLICY "Users can upload tool images to their organization folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);
--
CREATE POLICY "Users can view their organization's tool images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);
--
CREATE POLICY "Users can update their organization's tool images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);
--
CREATE POLICY "Users can delete their organization's tool images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'tool-images' AND
  (storage.foldername(name))[1] = (
    SELECT organization_id::text
    FROM users
    WHERE id = auth.uid()
  )
);

-- =========================================
-- From: 20251203000001_create_heavy_equipment_tables.sql
-- =========================================
CREATE POLICY "heavy_equipment_select_own_org" ON heavy_equipment FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "heavy_equipment_insert_leader_admin" ON heavy_equipment FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

CREATE POLICY "heavy_equipment_update_leader_admin" ON heavy_equipment FOR UPDATE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

CREATE POLICY "heavy_equipment_delete_admin" ON heavy_equipment FOR DELETE
USING (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- heavy_equipment_usage_records
--
CREATE POLICY "usage_records_select_own_org" ON heavy_equipment_usage_records FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "usage_records_insert_authenticated" ON heavy_equipment_usage_records FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND user_id = auth.uid()
);

-- heavy_equipment_maintenance
ALTER TABLE heavy_equipment_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_select_own_org" ON heavy_equipment_maintenance FOR SELECT
USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "maintenance_insert_leader_admin" ON heavy_equipment_maintenance FOR INSERT
WITH CHECK (
  organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role IN ('leader', 'admin')
  )
);

-- ==========================================

-- =========================================
-- From: 20251209000001_create_package_control_tables.sql
-- =========================================
    CREATE POLICY "Organizations can view their own feature flags"
      ON feature_flags FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

COMMENT ON TABLE feature_flags IS '機能フラグテーブル - 組織ごとの詳細な機能制御';
--
    CREATE POLICY "Organizations can view their own contract history"
      ON contract_history FOR SELECT
      USING (
        organization_id IN (
          SELECT organization_id FROM users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

COMMENT ON TABLE contract_history IS '契約履歴テーブル - 契約変更の履歴を記録';

-- =========================================
-- From: 20251209000002_enable_super_admins_rls.sql
-- =========================================
CREATE POLICY "super_admins_no_access"
ON super_admins
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);

-- Enable RLS on super_admin_logs table
ALTER TABLE super_admin_logs ENABLE ROW LEVEL SECURITY;

-- Restrictive policy: Deny all access to anon and authenticated users
CREATE POLICY "super_admin_logs_no_access"
ON super_admin_logs
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);

-- =========================================
-- From: 20251210000000_create_tool_master_presets.sql
-- =========================================
CREATE POLICY "Authenticated users can view tool master presets"
    ON tool_master_presets FOR SELECT
    TO authenticated
    USING (is_active = true);

-- INSERT: super_adminのみ作成可能
CREATE POLICY "Only super admins can create tool master presets"
    ON tool_master_presets FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

--
CREATE POLICY "Only super admins can update tool master presets"
    ON tool_master_presets FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );

--
CREATE POLICY "Only super admins can delete tool master presets"
    ON tool_master_presets FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role = 'super_admin'
        )
    );


-- =========================================
-- From: 20251212000001_add_system_common_tools.sql
-- =========================================
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

--
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

-- =========================================
-- From: 20251212000002_add_system_common_categories.sql
-- =========================================
DROP POLICY IF EXISTS "Users can view own organization tool_categories" ON tool_categories;
DROP POLICY IF EXISTS "Users can insert own organization tool_categories" ON tool_categories;
DROP POLICY IF EXISTS "Users can update own organization tool_categories" ON tool_categories;
DROP POLICY IF EXISTS "Users can delete own organization tool_categories" ON tool_categories;

-- 新しいポリシー: 閲覧（自組織 + 共通カテゴリ）
CREATE POLICY "Users can view tool_categories" ON tool_categories
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    (is_system_common = false AND organization_id = get_organization_id()) OR
    (is_system_common = true AND organization_id IS NULL)
  )
);

-- 新しいポリシー: 挿入（自組織のみ）
CREATE POLICY "Users can insert own organization tool_categories" ON tool_categories
FOR INSERT
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- 新しいポリシー: 更新（自組織のみ）
CREATE POLICY "Users can update own organization tool_categories" ON tool_categories
FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
)
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);
--
CREATE POLICY "Users can delete own organization tool_categories" ON tool_categories
FOR DELETE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
);

-- Step 5: インデックスを追加
CREATE INDEX IF NOT EXISTS idx_tool_categories_system_common
ON tool_categories(is_system_common)

-- =========================================
-- From: 20251212000003_create_tool_manufacturers.sql
-- =========================================
CREATE POLICY "Users can view tool_manufacturers" ON tool_manufacturers
FOR SELECT
USING (
  (deleted_at IS NULL) AND (
    (is_system_common = false AND organization_id = get_organization_id()) OR
    (is_system_common = true AND organization_id IS NULL)
  )
);

-- 挿入ポリシー: 自組織のメーカーのみ
CREATE POLICY "Users can insert own organization tool_manufacturers" ON tool_manufacturers
FOR INSERT
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);

-- 更新ポリシー: 自組織のメーカーのみ
CREATE POLICY "Users can update own organization tool_manufacturers" ON tool_manufacturers
FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
)
WITH CHECK (
  organization_id = get_organization_id() AND
  is_system_common = false
);
--
CREATE POLICY "Users can delete own organization tool_manufacturers" ON tool_manufacturers
FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  is_system_common = false AND
  deleted_at IS NULL
);

-- Step 4: システム共通メーカーの初期データ挿入
-- 建設・塗装業界の主要メーカー
INSERT INTO tool_manufacturers (organization_id, is_system_common, name, country) VALUES

-- =========================================
-- From: 20251212000010_create_packages_system.sql
-- =========================================
CREATE POLICY "Super admin full access to packages"
  ON packages FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access to package_features"
  ON package_features FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

CREATE POLICY "Super admin full access to contract_packages"
  ON contract_packages FOR ALL
  USING (auth.jwt() ->> 'role' = 'super_admin');

-- 初期データ投入（既存の3パッケージ）
INSERT INTO packages (name, description, monthly_fee, package_key, display_order) VALUES
('現場資産パック', '道具管理、重機管理、在庫管理などの資産管理機能', 18000, 'has_asset_package', 1),
('現場DX業務効率化パック', '勤怠管理、作業報告書、帳票管理などの業務効率化機能', 22000, 'has_dx_efficiency_package', 2),
('フル機能統合パック', '全機能が利用可能（割引適用）', 32000, 'has_both_packages', 3);

-- 現場資産パックの機能

-- =========================================
-- From: 20251212000012_stripe_integration.sql
-- =========================================
CREATE POLICY "Super Admin can view all stripe events"
  ON stripe_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

--
CREATE POLICY "Users can view own organization plan change requests"
  ON plan_change_requests
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
--
CREATE POLICY "Admin can create plan change requests"
  ON plan_change_requests
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

--
CREATE POLICY "Users can view own organization invoice schedules"
  ON invoice_schedules
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()

-- =========================================
-- From: 20251213000001_create_invoice_items.sql
-- =========================================
CREATE POLICY "Super admins can view all invoice items"
  ON invoice_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
--
CREATE POLICY "Super admins can insert invoice items"
  ON invoice_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
--
CREATE POLICY "Super admins can update invoice items"
  ON invoice_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );
--
CREATE POLICY "Super admins can delete invoice items"
  ON invoice_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- =========================================
-- From: 20251213000003_add_service_key_logs.sql
-- =========================================
CREATE POLICY "Super admins can view service key logs"
  ON public.service_key_access_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.super_admins
      WHERE super_admins.id = auth.uid()
        AND super_admins.is_active = true
    )
  );

--
CREATE POLICY "System can insert service key logs"
  ON public.service_key_access_logs
  FOR INSERT
  WITH CHECK (true);

-- コメント
COMMENT ON TABLE public.service_key_access_logs IS 'Supabaseサービスロールキーのアクセスログ';
COMMENT ON COLUMN public.service_key_access_logs.admin_id IS '操作を行った管理者ID';
COMMENT ON COLUMN public.service_key_access_logs.action IS '操作種別（encrypt/decrypt/rotate）';
COMMENT ON COLUMN public.service_key_access_logs.metadata IS '追加メタデータ';
COMMENT ON COLUMN public.service_key_access_logs.ip_address IS 'アクセス元IPアドレス';

-- =========================================
-- From: 20251213000004_add_2fa_reset_tokens.sql
-- =========================================
CREATE POLICY "Users can view their own reset tokens" ON two_factor_reset_tokens
  FOR SELECT USING (auth.uid() = user_id);

-- 管理者は組織内のリセットログを閲覧可能
CREATE POLICY "Admins can view organization reset logs" ON two_factor_reset_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'leader')
      AND users.organization_id = (
        SELECT organization_id FROM users WHERE id = two_factor_reset_logs.user_id
      )
    )
  );

-- =========================================
-- From: 20251213000005_add_system_settings.sql
-- =========================================
CREATE POLICY "Super admins can manage system settings" ON system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE id = auth.uid()
    )
  );

-- ログイン試行記録は挿入のみ可能
CREATE POLICY "Anyone can insert login attempts" ON login_attempts
  FOR INSERT WITH CHECK (true);

-- スーパー管理者はログイン試行記録を閲覧可能
CREATE POLICY "Super admins can view login attempts" ON login_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM super_admins
      WHERE id = auth.uid()
    )
  );

-- =========================================
-- From: 20251213000006_add_password_reset_tokens.sql
-- =========================================
CREATE POLICY "Service role can manage password reset tokens"
  ON password_reset_tokens
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- コメント
COMMENT ON TABLE password_reset_tokens IS 'パスワードリセットトークン管理テーブル';
COMMENT ON COLUMN password_reset_tokens.id IS 'トークンID';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'ユーザーID';

-- =========================================
-- From: 20251213000007_add_2fa_grace_period.sql
-- =========================================
CREATE POLICY "Users can view own grace period" ON two_factor_grace_periods
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 猶予期間ポリシー（管理者は組織内の猶予期間を管理可能）
CREATE POLICY "Admins can manage organization grace periods" ON two_factor_grace_periods
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND organization_id = two_factor_grace_periods.organization_id
      AND role = 'admin'
    )
  );
--
CREATE POLICY "Users can manage own tokens" ON two_factor_tokens
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE two_factor_grace_periods IS '2FA必須化時の猶予期間管理';
COMMENT ON COLUMN two_factor_grace_periods.status IS 'pending: 猶予期間中, completed: 2FA設定完了, expired: 猶予期間切れ, exempted: 免除';
COMMENT ON COLUMN two_factor_grace_periods.reminder_count IS 'リマインダー送信回数';

COMMENT ON TABLE two_factor_tokens IS '2FA一時トークン管理（メール、SMS用）';

-- =========================================
-- From: 20251213000008_add_security_features.sql
-- =========================================
CREATE POLICY "Admins can view login attempts" ON login_attempts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage lockouts" ON account_lockouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

--
CREATE POLICY "Users can view own password history" ON password_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- コメント
COMMENT ON TABLE login_attempts IS 'ログイン試行履歴';
COMMENT ON TABLE account_lockouts IS 'アカウントロックアウト管理';
COMMENT ON TABLE password_history IS 'パスワード履歴（再利用防止）';
COMMENT ON COLUMN users.password_changed_at IS 'パスワード最終変更日時';
COMMENT ON COLUMN users.password_expires_at IS 'パスワード有効期限';

-- =========================================
-- From: 20251215000001_add_estimate_history.sql
-- =========================================
CREATE POLICY "Users can view estimate history in their organization"
  ON estimate_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- システムからの履歴記録を許可（アプリケーションレベルで制御）
CREATE POLICY "Allow insert estimate history"
  ON estimate_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- コメント追加
COMMENT ON TABLE estimate_history IS '見積書の操作履歴を記録';

-- =========================================
-- From: 20251215000002_add_estimate_reads.sql
-- =========================================
CREATE POLICY "Users can view their own estimate reads"
  ON estimate_reads
  FOR SELECT
  USING (user_id = auth.uid());

-- ユーザーは自分の既読情報を記録可能
CREATE POLICY "Users can insert their own estimate reads"
  ON estimate_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- コメント追加
COMMENT ON TABLE estimate_reads IS '見積書の既読管理（マネージャー・管理者用）';
COMMENT ON COLUMN estimate_reads.estimate_id IS '既読した見積書ID';
COMMENT ON COLUMN estimate_reads.user_id IS '既読したユーザーID';
COMMENT ON COLUMN estimate_reads.read_at IS '既読日時';

-- =========================================
-- From: 20251215000003_add_estimate_notifications.sql
-- =========================================
DROP POLICY IF EXISTS "Users can view their notifications" ON notifications;

CREATE POLICY "Users can view their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    (organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND deleted_at IS NULL)
    OR
    (target_user_id = auth.uid() AND deleted_at IS NULL)
  );

-- =========================================
-- From: 20251216000902_create_invoice_history.sql
-- =========================================
CREATE POLICY "Users can view invoice history in their organization"
  ON invoice_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoice history in their organization"
  ON invoice_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- コメントを追加
COMMENT ON TABLE invoice_history IS '請求書の操作履歴を記録するテーブル';

-- =========================================
-- From: 20251216000940_fix_billing_invoice_items_rls.sql
-- =========================================
CREATE POLICY "Users can insert invoice items in their organization"
  ON billing_invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
--
CREATE POLICY "Users can update invoice items in their organization"
  ON billing_invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
--
CREATE POLICY "Users can delete invoice items in their organization"
  ON billing_invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_invoice_items.invoice_id
      AND i.organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )

-- =========================================
-- From: 20251216001100_add_billing_invoices_update_policy.sql
-- =========================================
CREATE POLICY "Users can update invoices in their organization"
  ON billing_invoices
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- =========================================
-- From: 20251216001500_create_purchase_orders.sql
-- =========================================
CREATE POLICY "Users can view suppliers in their organization"
  ON suppliers FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert suppliers"
  ON suppliers FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Admins can update suppliers"
  ON suppliers FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Admins can delete suppliers"
  ON suppliers FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- purchase_orders RLSポリシー
CREATE POLICY "Users can view purchase orders in their organization"
  ON purchase_orders FOR SELECT
  USING (organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert purchase orders"
  ON purchase_orders FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own purchase orders"
  ON purchase_orders FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND (
      created_by = auth.uid() OR
      EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'leader'))
    )
  );

CREATE POLICY "Admins can delete purchase orders"
  ON purchase_orders FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- purchase_order_items RLSポリシー
CREATE POLICY "Users can view purchase order items"
  ON purchase_order_items FOR SELECT
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage purchase order items"
  ON purchase_order_items FOR ALL
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- purchase_order_history RLSポリシー
CREATE POLICY "Users can view purchase order history"
  ON purchase_order_history FOR SELECT
  USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert purchase order history"
  ON purchase_order_history FOR INSERT
  WITH CHECK (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    ) AND created_by = auth.uid()
  );

-- updated_atを自動更新するトリガー

-- =========================================
-- From: 20251216001600_add_purchase_order_missing_columns.sql
-- =========================================
    CREATE POLICY "Users can view purchase order history"
      ON purchase_order_history FOR SELECT
      USING (
        purchase_order_id IN (
          SELECT id FROM purchase_orders WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        )
      );
  END IF;

--
    CREATE POLICY "Users can insert purchase order history"
      ON purchase_order_history FOR INSERT
      WITH CHECK (
        purchase_order_id IN (
          SELECT id FROM purchase_orders WHERE organization_id IN (
            SELECT organization_id FROM users WHERE id = auth.uid()
          )
        ) AND created_by = auth.uid()
      );
  END IF;
END $$;

-- =========================================
-- From: 20251216002000_create_purchase_order_settings.sql
-- =========================================
CREATE POLICY "Users can view their organization settings"
  ON purchase_order_settings
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can update their organization settings"
  ON purchase_order_settings
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert their organization settings"
  ON purchase_order_settings
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- インデックス作成
CREATE INDEX idx_purchase_order_settings_org ON purchase_order_settings(organization_id);

-- =========================================
-- From: 20251219000002_update_purchase_order_history.sql
-- =========================================
DROP POLICY IF EXISTS "Users can view purchase order history" ON purchase_order_history;
DROP POLICY IF EXISTS "Users can insert purchase order history" ON purchase_order_history;

CREATE POLICY "Users can view purchase order history"
  ON purchase_order_history
  FOR SELECT
  TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert purchase order history"
  ON purchase_order_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND performed_by = auth.uid()
  );


