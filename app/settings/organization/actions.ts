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
    consumable_movement_tracking: 'quantity' | 'simple' | 'none'
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
      consumable_movement_tracking: settings.consumable_movement_tracking,
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

export async function saveWarehouseHierarchyTemplates(
  organizationId: string,
  templates: Array<{
    level: number
    label: string
    is_active: boolean
  }>
) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('ユーザーが見つかりません')
  }

  // ユーザーの権限を確認
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'admin') {
    throw new Error('管理者権限が必要です')
  }

  if (userData.organization_id !== organizationId) {
    throw new Error('他の組織の設定は変更できません')
  }

  // 既存のテンプレートを削除
  await supabase
    .from('warehouse_location_templates')
    .delete()
    .eq('organization_id', organizationId)

  // アクティブなテンプレートのみ保存
  const activeTemplates = templates
    .filter((t) => t.is_active && t.label.trim())
    .map((t, index) => ({
      organization_id: organizationId,
      level: t.level,
      label: t.label.trim(),
      is_active: true,
      display_order: index,
    }))

  if (activeTemplates.length > 0) {
    const { error: insertError } = await supabase
      .from('warehouse_location_templates')
      .insert(activeTemplates)

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error('テンプレートの保存に失敗しました: ' + insertError.message)
    }
  }

  revalidatePath('/settings/organization')
  revalidatePath('/warehouse-locations/new')
}

export async function deleteWarehouseHierarchyTemplate(templateId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('ユーザーが見つかりません')
  }

  // ユーザーの権限を確認
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role !== 'admin') {
    throw new Error('管理者権限が必要です')
  }

  const { error } = await supabase
    .from('warehouse_location_templates')
    .delete()
    .eq('id', templateId)
    .eq('organization_id', userData.organization_id)

  if (error) {
    throw new Error('削除に失敗しました: ' + error.message)
  }

  revalidatePath('/settings/organization')
}
