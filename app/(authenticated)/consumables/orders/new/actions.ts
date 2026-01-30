'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logConsumableCreated } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

export async function createConsumableOrder(formData: FormData) {
  const supabase = await createClient()

  // ユーザー認証確認
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報が見つかりません')
  }

  // フォームデータ取得
  let toolId = formData.get('tool_id') as string
  const orderNumber = formData.get('order_number') as string
  const orderDate = formData.get('order_date') as string
  const expectedDeliveryDate = formData.get('expected_delivery_date') as string
  const quantity = parseInt(formData.get('quantity') as string, 10)
  const unitPrice = formData.get('unit_price') as string
  const totalPrice = formData.get('total_price') as string
  const clientId = formData.get('client_id') as string
  const notes = formData.get('notes') as string

  // 不審なパターン検出
  const textFields = [
    { field: 'notes', value: notes, label: '備考' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      throw new Error(`${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`)
    }
  }

  // 新規消耗品の場合は先に消耗品を登録
  const newConsumableName = formData.get('new_consumable_name') as string
  if (newConsumableName) {
    const newConsumableUnit = formData.get('new_consumable_unit') as string
    const newConsumableModel = formData.get('new_consumable_model') as string
    const newConsumableManufacturer = formData.get('new_consumable_manufacturer') as string

    // 新規消耗品フィールドの不審なパターン検出
    const newConsumableFields = [
      { field: 'new_consumable_name', value: newConsumableName, label: '消耗品名' },
      { field: 'new_consumable_model', value: newConsumableModel, label: '型番' },
      { field: 'new_consumable_manufacturer', value: newConsumableManufacturer, label: 'メーカー' },
    ]

    for (const { value, label } of newConsumableFields) {
      if (value && hasSuspiciousPattern(value)) {
        throw new Error(`${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`)
      }
    }

    // HTMLエスケープ処理
    const sanitizedConsumableData = {
      organization_id: userData.organization_id,
      name: escapeHtml(newConsumableName),
      model_number: newConsumableModel ? escapeHtml(newConsumableModel) : null,
      manufacturer: newConsumableManufacturer ? escapeHtml(newConsumableManufacturer) : null,
      unit: newConsumableUnit,
      management_type: 'consumable' as const,
      minimum_stock: 0,
      // qr_codeはUUID型でデフォルト値が設定されているので省略
    }

    // QRコード生成（UUID型なのでデフォルト値を使用）
    const { data: newConsumable, error: consumableError } = await supabase
      .from('tools')
      .insert(sanitizedConsumableData)
      .select('id, qr_code')
      .single()

    if (consumableError || !newConsumable) {
      console.error('消耗品登録エラー:', consumableError)
      throw new Error(`消耗品の登録に失敗しました: ${consumableError?.message}`)
    }

    // 監査ログを記録（新規消耗品作成）
    await logConsumableCreated(newConsumable.id, {
      name: newConsumableName,
      model_number: newConsumableModel || null,
      manufacturer: newConsumableManufacturer || null,
      unit: newConsumableUnit,
      management_type: 'consumable',
      qr_code: newConsumable.qr_code
    }, user.id, userData.organization_id)

    toolId = newConsumable.id
  }

  // バリデーション
  if (!toolId || !orderNumber || !orderDate || !quantity || quantity < 1) {
    throw new Error('必須項目を入力してください')
  }

  // 発注番号の重複チェック
  const { data: existingOrder } = await supabase
    .from('consumable_orders')
    .select('id')
    .eq('organization_id', userData?.organization_id)
    .eq('order_number', orderNumber)
    .is('deleted_at', null)
    .single()

  if (existingOrder) {
    throw new Error('この発注番号は既に使用されています')
  }

  // HTMLエスケープ処理（発注データ）
  const sanitizedNotes = notes ? escapeHtml(notes) : null

  // 発注データ作成
  const { error } = await supabase.from('consumable_orders').insert({
    organization_id: userData?.organization_id,
    tool_id: toolId,
    order_number: orderNumber,
    order_date: orderDate,
    expected_delivery_date: expectedDeliveryDate || null,
    quantity,
    unit_price: unitPrice ? parseFloat(unitPrice) : null,
    total_price: totalPrice ? parseFloat(totalPrice) : null,
    client_id: clientId || null,
    notes: sanitizedNotes,
    status: '下書き中',
    ordered_by: user.id,
  })

  if (error) {
    console.error('発注登録エラー:', error)
    throw new Error(`発注の登録に失敗しました: ${error.message}`)
  }

  revalidatePath('/consumables/orders')
  redirect('/consumables/orders')
}
