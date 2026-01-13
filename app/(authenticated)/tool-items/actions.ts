'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateToolItemStatus(
  toolItemId: string,
  status: string,
  notes?: string
) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証されていません')
  }

  // ステータス更新
  const { error } = await supabase
    .from('tool_items')
    .update({
      status,
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', toolItemId)

  if (error) {
    console.error('Status update error:', error)
    throw new Error('ステータスの更新に失敗しました')
  }

  revalidatePath(`/tool-items/${toolItemId}`)
  return { success: true }
}
