'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logEquipmentCreated, logEquipmentUpdated, logEquipmentDeleted } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

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

  // 不審なパターン検出
  const textFields = [
    { field: 'equipment_code', value: equipmentData.equipment_code, label: '重機コード' },
    { field: 'name', value: equipmentData.name, label: '重機名' },
    { field: 'manufacturer', value: equipmentData.manufacturer, label: 'メーカー' },
    { field: 'model_number', value: equipmentData.model_number, label: '型式' },
    { field: 'serial_number', value: equipmentData.serial_number, label: 'シリアル番号' },
    { field: 'registration_number', value: equipmentData.registration_number, label: '登録番号' },
    { field: 'supplier_company', value: equipmentData.supplier_company, label: '仕入先' },
    { field: 'contract_number', value: equipmentData.contract_number, label: '契約番号' },
    { field: 'insurance_company', value: equipmentData.insurance_company, label: '保険会社' },
    { field: 'insurance_policy_number', value: equipmentData.insurance_policy_number, label: '保険証券番号' },
    { field: 'notes', value: equipmentData.notes, label: '備考' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return { success: false, error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` }
    }
  }

  // HTMLエスケープ処理
  const sanitizedData = {
    equipment_code: equipmentData.equipment_code ? escapeHtml(equipmentData.equipment_code) : null,
    name: equipmentData.name ? escapeHtml(equipmentData.name) : null,
    manufacturer: equipmentData.manufacturer ? escapeHtml(equipmentData.manufacturer) : null,
    model_number: equipmentData.model_number ? escapeHtml(equipmentData.model_number) : null,
    serial_number: equipmentData.serial_number ? escapeHtml(equipmentData.serial_number) : null,
    registration_number: equipmentData.registration_number ? escapeHtml(equipmentData.registration_number) : null,
    supplier_company: equipmentData.supplier_company ? escapeHtml(equipmentData.supplier_company) : null,
    contract_number: equipmentData.contract_number ? escapeHtml(equipmentData.contract_number) : null,
    insurance_company: equipmentData.insurance_company ? escapeHtml(equipmentData.insurance_company) : null,
    insurance_policy_number: equipmentData.insurance_policy_number ? escapeHtml(equipmentData.insurance_policy_number) : null,
    notes: equipmentData.notes ? escapeHtml(equipmentData.notes) : null,
    // 非テキストフィールドはそのまま
    category_id: equipmentData.category_id,
    ownership_type: equipmentData.ownership_type,
    status: equipmentData.status,
    purchase_date: equipmentData.purchase_date,
    purchase_price: equipmentData.purchase_price,
    current_location_id: equipmentData.current_location_id,
    requires_vehicle_inspection: equipmentData.requires_vehicle_inspection,
    vehicle_inspection_date: equipmentData.vehicle_inspection_date,
    insurance_start_date: equipmentData.insurance_start_date,
    insurance_end_date: equipmentData.insurance_end_date,
  }

  try {
    // 重機を挿入
    const { data, error } = await supabase
      .from('heavy_equipment')
      .insert({
        ...sanitizedData,
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
    }, user.id, userData.organization_id)

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

  // ユーザーの組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'User data not found' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'equipment_code', value: equipmentData.equipment_code, label: '重機コード' },
    { field: 'name', value: equipmentData.name, label: '重機名' },
    { field: 'manufacturer', value: equipmentData.manufacturer, label: 'メーカー' },
    { field: 'model_number', value: equipmentData.model_number, label: '型式' },
    { field: 'serial_number', value: equipmentData.serial_number, label: 'シリアル番号' },
    { field: 'registration_number', value: equipmentData.registration_number, label: '登録番号' },
    { field: 'supplier_company', value: equipmentData.supplier_company, label: '仕入先' },
    { field: 'contract_number', value: equipmentData.contract_number, label: '契約番号' },
    { field: 'insurance_company', value: equipmentData.insurance_company, label: '保険会社' },
    { field: 'insurance_policy_number', value: equipmentData.insurance_policy_number, label: '保険証券番号' },
    { field: 'notes', value: equipmentData.notes, label: '備考' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return { success: false, error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` }
    }
  }

  // HTMLエスケープ処理
  const sanitizedData = {
    equipment_code: equipmentData.equipment_code !== undefined
      ? (equipmentData.equipment_code ? escapeHtml(equipmentData.equipment_code) : null)
      : undefined,
    name: equipmentData.name !== undefined
      ? (equipmentData.name ? escapeHtml(equipmentData.name) : null)
      : undefined,
    manufacturer: equipmentData.manufacturer !== undefined
      ? (equipmentData.manufacturer ? escapeHtml(equipmentData.manufacturer) : null)
      : undefined,
    model_number: equipmentData.model_number !== undefined
      ? (equipmentData.model_number ? escapeHtml(equipmentData.model_number) : null)
      : undefined,
    serial_number: equipmentData.serial_number !== undefined
      ? (equipmentData.serial_number ? escapeHtml(equipmentData.serial_number) : null)
      : undefined,
    registration_number: equipmentData.registration_number !== undefined
      ? (equipmentData.registration_number ? escapeHtml(equipmentData.registration_number) : null)
      : undefined,
    supplier_company: equipmentData.supplier_company !== undefined
      ? (equipmentData.supplier_company ? escapeHtml(equipmentData.supplier_company) : null)
      : undefined,
    contract_number: equipmentData.contract_number !== undefined
      ? (equipmentData.contract_number ? escapeHtml(equipmentData.contract_number) : null)
      : undefined,
    insurance_company: equipmentData.insurance_company !== undefined
      ? (equipmentData.insurance_company ? escapeHtml(equipmentData.insurance_company) : null)
      : undefined,
    insurance_policy_number: equipmentData.insurance_policy_number !== undefined
      ? (equipmentData.insurance_policy_number ? escapeHtml(equipmentData.insurance_policy_number) : null)
      : undefined,
    notes: equipmentData.notes !== undefined
      ? (equipmentData.notes ? escapeHtml(equipmentData.notes) : null)
      : undefined,
    // 非テキストフィールドはそのまま
    category_id: equipmentData.category_id,
    ownership_type: equipmentData.ownership_type,
    status: equipmentData.status,
    purchase_date: equipmentData.purchase_date,
    purchase_price: equipmentData.purchase_price,
    current_location_id: equipmentData.current_location_id,
    requires_vehicle_inspection: equipmentData.requires_vehicle_inspection,
    vehicle_inspection_date: equipmentData.vehicle_inspection_date,
    insurance_start_date: equipmentData.insurance_start_date,
    insurance_end_date: equipmentData.insurance_end_date,
  }

  // undefinedのキーを削除（部分更新対応）
  Object.keys(sanitizedData).forEach((key) => {
    if (sanitizedData[key as keyof typeof sanitizedData] === undefined) {
      delete sanitizedData[key as keyof typeof sanitizedData]
    }
  })

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
        ...sanitizedData,
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
      await logEquipmentUpdated(equipmentId, oldValues, newValues, user.id, userData.organization_id)
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
    }, user.id, userData.organization_id)

    // キャッシュを再検証
    revalidatePath('/equipment')

    return { success: true }
  } catch (error: any) {
    console.error('重機削除エラー:', error)
    return { success: false, error: error.message || '重機の削除に失敗しました' }
  }
}
