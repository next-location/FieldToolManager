'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logEquipmentCreated, logEquipmentUpdated, logEquipmentDeleted } from '@/lib/audit-log'

/**
 * 重機を作成
 */
export async function createEquipment(equipmentData: any) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // ユーザーの組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'User data not found' }
  }

  try {
    // 重機を挿入
    const { data, error } = await supabase
      .from('heavy_equipment')
      .insert({
        ...equipmentData,
        organization_id: userData.organization_id,
      })
      .select()
      .single()

    if (error) throw error

    // 監査ログを記録
    await logEquipmentCreated(data.id, {
      equipment_code: data.equipment_code,
      name: data.name,
      category_id: data.category_id,
      manufacturer: data.manufacturer,
      model_number: data.model_number,
      serial_number: data.serial_number,
      registration_number: data.registration_number,
      ownership_type: data.ownership_type,
      status: data.status,
    })

    // キャッシュを再検証
    revalidatePath('/equipment')

    return { success: true, data }
  } catch (error: any) {
    console.error('重機作成エラー:', error)
    return { success: false, error: error.message || '重機の作成に失敗しました' }
  }
}

/**
 * 重機を更新
 */
export async function updateEquipment(equipmentId: string, equipmentData: any) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // 更新前のデータを取得（監査ログ用）
    const { data: oldData } = await supabase
      .from('heavy_equipment')
      .select('*')
      .eq('id', equipmentId)
      .single()

    if (!oldData) {
      return { success: false, error: 'Equipment not found' }
    }

    // 重機を更新
    const { data, error } = await supabase
      .from('heavy_equipment')
      .update({
        ...equipmentData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)
      .select()
      .single()

    if (error) throw error

    // 監査ログを記録（変更された項目のみ）
    const oldValues: Record<string, any> = {}
    const newValues: Record<string, any> = {}

    const fieldsToLog = [
      'equipment_code',
      'name',
      'category_id',
      'manufacturer',
      'model_number',
      'serial_number',
      'registration_number',
      'ownership_type',
      'status',
      'current_location_id',
      'requires_vehicle_inspection',
      'vehicle_inspection_date',
      'insurance_company',
      'insurance_policy_number',
      'insurance_start_date',
      'insurance_end_date',
    ]

    fieldsToLog.forEach((field) => {
      if (oldData[field] !== data[field]) {
        oldValues[field] = oldData[field]
        newValues[field] = data[field]
      }
    })

    if (Object.keys(newValues).length > 0) {
      await logEquipmentUpdated(equipmentId, oldValues, newValues)
    }

    // キャッシュを再検証
    revalidatePath('/equipment')
    revalidatePath(`/equipment/${equipmentId}`)

    return { success: true, data }
  } catch (error: any) {
    console.error('重機更新エラー:', error)
    return { success: false, error: error.message || '重機の更新に失敗しました' }
  }
}

/**
 * 重機を削除（論理削除）
 */
export async function deleteEquipment(equipmentId: string) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  try {
    // 削除前のデータを取得（監査ログ用）
    const { data: equipmentData } = await supabase
      .from('heavy_equipment')
      .select('*')
      .eq('id', equipmentId)
      .single()

    if (!equipmentData) {
      return { success: false, error: 'Equipment not found' }
    }

    // 論理削除（deleted_atを設定）
    const { error } = await supabase
      .from('heavy_equipment')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', equipmentId)

    if (error) throw error

    // 監査ログを記録
    await logEquipmentDeleted(equipmentId, {
      equipment_code: equipmentData.equipment_code,
      name: equipmentData.name,
      category_id: equipmentData.category_id,
      manufacturer: equipmentData.manufacturer,
      model_number: equipmentData.model_number,
      serial_number: equipmentData.serial_number,
      registration_number: equipmentData.registration_number,
      ownership_type: equipmentData.ownership_type,
      status: equipmentData.status,
    })

    // キャッシュを再検証
    revalidatePath('/equipment')

    return { success: true }
  } catch (error: any) {
    console.error('重機削除エラー:', error)
    return { success: false, error: error.message || '重機の削除に失敗しました' }
  }
}
