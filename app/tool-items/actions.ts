'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 個別アイテムのステータスを変更
 * 紛失、廃棄、メンテナンスなどの特別な状態変更に使用
 */
export async function updateToolItemStatus(formData: FormData) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { error: 'ユーザー情報が見つかりません' }
  }

  // フォームデータ取得
  const toolItemId = formData.get('tool_item_id') as string
  const newStatus = formData.get('status') as string
  const movementType = formData.get('movement_type') as string
  const notes = formData.get('notes') as string

  if (!toolItemId || !newStatus || !movementType || !notes) {
    return { error: '必須項目が入力されていません' }
  }

  // 個別アイテム情報を取得
  const { data: toolItem, error: fetchError } = await supabase
    .from('tool_items')
    .select('*, tools(id, name)')
    .eq('id', toolItemId)
    .eq('organization_id', userData.organization_id)
    .single()

  if (fetchError || !toolItem) {
    return { error: '道具が見つかりません' }
  }

  try {
    // 1. tool_itemsのステータスを更新
    const { error: updateError } = await supabase
      .from('tool_items')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', toolItemId)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('Status update error:', updateError)
      return { error: 'ステータスの更新に失敗しました' }
    }

    // 2. tool_movementsに履歴を記録
    const { error: movementError } = await supabase.from('tool_movements').insert({
      organization_id: userData.organization_id,
      tool_id: (toolItem.tools as any).id,
      tool_item_id: toolItemId,
      movement_type: movementType,
      from_location: toolItem.current_location,
      from_site_id: toolItem.current_site_id,
      to_location: toolItem.current_location, // 場所は変わらない
      to_site_id: toolItem.current_site_id,
      quantity: 1,
      performed_by: user.id,
      notes: notes,
    })

    if (movementError) {
      console.error('Movement history error:', movementError)
      return { error: '履歴の記録に失敗しました' }
    }

    // 3. toolsテーブルの数量を更新（紛失・廃棄の場合）
    if (newStatus === 'lost' || newStatus === 'disposed') {
      // 利用可能な個別アイテム数をカウント
      const { count } = await supabase
        .from('tool_items')
        .select('*', { count: 'exact', head: true })
        .eq('tool_id', (toolItem.tools as any).id)
        .eq('organization_id', userData.organization_id)
        .in('status', ['available', 'in_use', 'maintenance'])
        .is('deleted_at', null)

      // 道具マスタの数量を更新
      await supabase
        .from('tools')
        .update({ quantity: count || 0 })
        .eq('id', (toolItem.tools as any).id)
        .eq('organization_id', userData.organization_id)
    }

    revalidatePath('/tool-items/[id]', 'page')
    revalidatePath('/tools')
    revalidatePath('/movements')

    return { success: true }
  } catch (error: any) {
    console.error('Error updating tool item status:', error)
    return { error: error.message || 'ステータスの変更に失敗しました' }
  }
}
