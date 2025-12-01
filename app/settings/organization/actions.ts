'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateOrganizationSettings(
  organizationId: string,
  settings: {
    require_qr_scan_on_movement: boolean
    require_qr_scan_on_return: boolean
    require_approval_for_loss: boolean
    enable_monthly_inventory_reminder: boolean
    enable_site_closure_checklist: boolean
  }
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'ユーザーが見つかりません' }
  }

  // ユーザーの権限を確認
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'admin') {
    return { error: '管理者権限が必要です' }
  }

  if (userData.organization_id !== organizationId) {
    return { error: '他の組織の設定は変更できません' }
  }

  // 設定を更新
  const { error: updateError } = await supabase
    .from('organizations')
    .update({
      require_qr_scan_on_movement: settings.require_qr_scan_on_movement,
      require_qr_scan_on_return: settings.require_qr_scan_on_return,
      require_approval_for_loss: settings.require_approval_for_loss,
      enable_monthly_inventory_reminder:
        settings.enable_monthly_inventory_reminder,
      enable_site_closure_checklist: settings.enable_site_closure_checklist,
      updated_at: new Date().toISOString(),
    })
    .eq('id', organizationId)

  if (updateError) {
    console.error('Update error:', updateError)
    return { error: '更新に失敗しました: ' + updateError.message }
  }

  revalidatePath('/settings/organization')
  return { success: true }
}
