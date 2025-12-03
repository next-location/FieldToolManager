'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createToolSet(formData: FormData) {
  const supabase = await createClient()

  const name = formData.get('name') as string
  const description = formData.get('description') as string
  const toolItemIds = formData.getAll('tool_item_ids') as string[]

  // ユーザー情報と組織IDを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報が見つかりません')
  }

  // 選択された個別アイテムが1つ以上あるかチェック
  if (toolItemIds.length === 0) {
    throw new Error('道具を1つ以上選択してください')
  }

  // 道具セットを作成
  const { data: toolSet, error: setError } = await supabase
    .from('tool_sets')
    .insert({
      organization_id: userData.organization_id,
      name,
      description: description || null,
      created_by: user.id,
    })
    .select()
    .single()

  if (setError) {
    if (setError.code === '23505' && setError.message.includes('tool_sets_organization_id_name_key')) {
      throw new Error('同じ名前の道具セットがすでに登録されています。別の名前を使用してください。')
    }
    throw new Error(`道具セットの作成に失敗しました: ${setError.message}`)
  }

  // 選択された個別アイテムの情報を取得（tool_idが必要）
  const { data: toolItems, error: fetchError } = await supabase
    .from('tool_items')
    .select('id, tool_id')
    .in('id', toolItemIds)

  if (fetchError || !toolItems) {
    await supabase.from('tool_sets').delete().eq('id', toolSet.id)
    throw new Error(`道具情報の取得に失敗しました: ${fetchError?.message}`)
  }

  // tool_idとtool_item_idの両方を含むデータを作成
  const items = toolItems.map((item) => ({
    tool_set_id: toolSet.id,
    tool_id: item.tool_id,
    tool_item_id: item.id,
  }))

  const { error: itemsError } = await supabase.from('tool_set_items').insert(items)

  if (itemsError) {
    // セット作成に失敗した場合、作成した道具セットを削除（ロールバック）
    await supabase.from('tool_sets').delete().eq('id', toolSet.id)
    throw new Error(`道具の追加に失敗しました: ${itemsError.message}`)
  }

  revalidatePath('/tool-sets')
  redirect('/tool-sets')
}

export async function deleteToolSet(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('tool_sets')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`道具セットの削除に失敗しました: ${error.message}`)
  }

  revalidatePath('/tool-sets')
}
