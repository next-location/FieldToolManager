'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

export async function createMaintenanceRecord(maintenanceData: {
  equipment_id: string
  maintenance_type: string
  maintenance_date: string
  performed_by?: string
  cost?: number
  next_date?: string
  receipt_url?: string
  report_url?: string
  notes?: string
}) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // ユーザーの組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'ユーザー情報が見つかりません' }
  }

  // 権限チェック（リーダー以上）
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData.role)) {
    return { success: false, error: '点検記録の登録権限がありません。管理者またはリーダー権限が必要です。' }
  }

  try {
    // 不審なパターン検出
    const textFields = [
      { field: 'performed_by', value: maintenanceData.performed_by, label: '実施者' },
      { field: 'notes', value: maintenanceData.notes, label: '備考' },
    ]

    for (const { value, label } of textFields) {
      if (value && hasSuspiciousPattern(value)) {
        return { success: false, error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` }
      }
    }

    // HTMLエスケープ処理
    const sanitizedData = {
      organization_id: userData.organization_id,
      equipment_id: maintenanceData.equipment_id,
      maintenance_type: maintenanceData.maintenance_type,
      maintenance_date: maintenanceData.maintenance_date,
      performed_by: maintenanceData.performed_by ? escapeHtml(maintenanceData.performed_by) : null,
      cost: maintenanceData.cost || null,
      next_date: maintenanceData.next_date || null,
      receipt_url: maintenanceData.receipt_url || null,
      report_url: maintenanceData.report_url || null,
      notes: maintenanceData.notes ? escapeHtml(maintenanceData.notes) : null,
    }

    // 点検記録を作成
    const { data, error: insertError } = await supabase
      .from('heavy_equipment_maintenance')
      .insert(sanitizedData)
      .select()
      .single()

    if (insertError) {
      console.error('Maintenance record creation error:', insertError)
      throw insertError
    }

    // 車検または保険更新の場合、重機マスタの日付を更新
    if (maintenanceData.maintenance_type === 'vehicle_inspection' && maintenanceData.next_date) {
      await supabase
        .from('heavy_equipment')
        .update({ vehicle_inspection_date: maintenanceData.next_date })
        .eq('id', maintenanceData.equipment_id)
    } else if (maintenanceData.maintenance_type === 'insurance_renewal' && maintenanceData.next_date) {
      await supabase
        .from('heavy_equipment')
        .update({ insurance_end_date: maintenanceData.next_date })
        .eq('id', maintenanceData.equipment_id)
    }

    // キャッシュを再検証
    revalidatePath(`/equipment/${maintenanceData.equipment_id}`)
    revalidatePath('/equipment/maintenance-records')

    return { success: true, data }
  } catch (error: any) {
    console.error('点検記録登録エラー:', error)
    return { success: false, error: error.message || '点検記録の登録に失敗しました' }
  }
}
