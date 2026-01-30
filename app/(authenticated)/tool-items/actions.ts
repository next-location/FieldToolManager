'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

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

  // 不審なパターン検出
  if (notes && hasSuspiciousPattern(notes)) {
    throw new Error('備考に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）')
  }

  // HTMLエスケープ処理
  const sanitizedNotes = notes ? escapeHtml(notes) : null

  // ステータス更新
  const { error } = await supabase
    .from('tool_items')
    .update({
      status,
      notes: sanitizedNotes,
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
