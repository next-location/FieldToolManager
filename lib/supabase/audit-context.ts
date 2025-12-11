import { SupabaseClient } from '@supabase/supabase-js';

/**
 * スーパーアドミンの監査コンテキストを設定
 * 組織情報を変更する前に呼び出して、audit_logsに記録される操作者情報を設定する
 */
export async function setSuperAdminAuditContext(
  supabase: SupabaseClient,
  superAdminId: string,
  superAdminName: string
) {
  // PostgreSQLセッション変数を設定
  await supabase.rpc('set_audit_context', {
    setting_name: 'app.super_admin_id',
    new_value: superAdminId,
  });

  await supabase.rpc('set_audit_context', {
    setting_name: 'app.super_admin_name',
    new_value: superAdminName,
  });
}

/**
 * 監査コンテキストをクリア
 */
export async function clearAuditContext(supabase: SupabaseClient) {
  await supabase.rpc('set_audit_context', {
    setting_name: 'app.super_admin_id',
    new_value: '',
  });

  await supabase.rpc('set_audit_context', {
    setting_name: 'app.super_admin_name',
    new_value: '',
  });
}
