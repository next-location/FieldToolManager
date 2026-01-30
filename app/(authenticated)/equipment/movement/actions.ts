'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

interface CreateEquipmentMovementParams {
  equipment_id: string
  action_type: 'checkout' | 'checkin' | 'transfer'
  from_location_id: string | null
  to_location_id: string | null
  from_other_location: string | null
  to_other_location: string | null
  hour_meter_reading: number | null
  notes: string | null
}

export async function createEquipmentMovement(params: CreateEquipmentMovementParams) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { success: false, error: 'User data not found' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'notes', value: params.notes, label: '備考' },
    { field: 'from_other_location', value: params.from_other_location, label: '移動元（その他）' },
    { field: 'to_other_location', value: params.to_other_location, label: '移動先（その他）' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return {
        success: false,
        error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`,
      }
    }
  }

  // HTMLエスケープ処理
  const sanitizedNotes = params.notes ? escapeHtml(params.notes) : null
  const sanitizedFromOther = params.from_other_location ? escapeHtml(params.from_other_location) : null
  const sanitizedToOther = params.to_other_location ? escapeHtml(params.to_other_location) : null

  try {
    // 重機データを取得（default_location_id を追加）
    const { data: equipmentData } = await supabase
      .from('heavy_equipment')
      .select('organization_id, equipment_code, name, status, current_location_id, enable_hour_meter, current_hour_meter, default_location_id')
      .eq('id', params.equipment_id)
      .single()

    if (!equipmentData) {
      return { success: false, error: '重機データの取得に失敗しました' }
    }

    // 使用記録を作成
    const usageRecordData = {
      organization_id: equipmentData.organization_id,
      equipment_id: params.equipment_id,
      user_id: user.id,
      action_type: params.action_type,
      from_location_id: params.from_location_id === 'other' ? null : params.from_location_id,
      to_location_id: params.to_location_id === 'other' ? null : params.to_location_id,
      other_location_name:
        params.from_location_id === 'other'
          ? sanitizedFromOther
          : params.to_location_id === 'other'
            ? sanitizedToOther
            : null,
      hour_meter_reading: params.hour_meter_reading,
      notes: sanitizedNotes,
      action_at: new Date().toISOString(),
    }

    const { data: usageRecord, error: insertError } = await supabase
      .from('heavy_equipment_usage_records')
      .insert(usageRecordData)
      .select()
      .single()

    if (insertError) throw insertError

    // 重機の現在地とステータスを更新
    let newStatus = equipmentData.status
    let newLocationId: string | null = equipmentData.current_location_id
    let newUserId: string | null = user.id

    if (params.action_type === 'checkout') {
      newStatus = 'in_use'
      newLocationId = params.to_location_id === 'other' ? null : params.to_location_id
      newUserId = user.id
    } else if (params.action_type === 'checkin') {
      // 返却時はデフォルトの保管場所に戻す
      if (!(equipmentData as any).default_location_id) {
        return { success: false, error: 'デフォルトの保管場所が設定されていません' }
      }
      newStatus = 'available'
      newLocationId = (equipmentData as any).default_location_id
      newUserId = null
    } else if (params.action_type === 'transfer') {
      newLocationId = params.to_location_id === 'other' ? null : params.to_location_id
    }

    const updateData: any = {
      current_location_id: newLocationId,
      status: newStatus,
      current_user_id: newUserId,
      updated_at: new Date().toISOString(),
    }

    if (params.hour_meter_reading && equipmentData.enable_hour_meter) {
      updateData.current_hour_meter = params.hour_meter_reading
    }

    const { error: updateError } = await supabase
      .from('heavy_equipment')
      .update(updateData)
      .eq('id', params.equipment_id)

    if (updateError) throw updateError

    // 監査ログを記録（移動専用のログ関数を使用）
    const { logEquipmentMovement } = await import('@/lib/audit-log')
    await logEquipmentMovement(
      params.equipment_id,
      params.action_type,
      {
        current_location_id: equipmentData.current_location_id,
        status: equipmentData.status,
        current_user_id: equipmentData.current_location_id, // 移動前の使用者
      },
      {
        current_location_id: newLocationId,
        status: newStatus,
        current_user_id: newUserId,
        movement_record_id: usageRecord.id,
      },
      user.id,
      userData.organization_id
    )

    // キャッシュを再検証
    revalidatePath('/equipment')
    revalidatePath(`/equipment/${params.equipment_id}`)
    revalidatePath('/movements')

    return { success: true }
  } catch (error: any) {
    console.error('重機移動記録エラー:', error)
    return { success: false, error: error.message || '重機移動記録の登録に失敗しました' }
  }
}
