'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

/**
 * ユーザー設定を更新（氏名・部署）
 */
export async function updateUserSettings(settingsData: {
  name: string
  department?: string
}) {
  const supabase = await createClient()

  // ユーザー認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // バリデーション
  if (!settingsData.name || !settingsData.name.trim()) {
    return { success: false, error: '氏名を入力してください' }
  }

  // 不審なパターン検出
  const textFields = [
    { field: 'name', value: settingsData.name, label: '氏名' },
    { field: 'department', value: settingsData.department, label: '部署' },
  ]

  for (const { value, label } of textFields) {
    if (value && hasSuspiciousPattern(value)) {
      return {
        success: false,
        error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`,
      }
    }
  }

  try {
    // HTMLエスケープ処理
    const sanitizedData = {
      name: escapeHtml(settingsData.name.trim()),
      department: settingsData.department?.trim() ? escapeHtml(settingsData.department.trim()) : null,
    }

    // ユーザー設定を更新
    const { error } = await supabase
      .from('users')
      .update(sanitizedData)
      .eq('id', user.id)

    if (error) throw error

    // キャッシュを再検証
    revalidatePath('/settings')
    revalidatePath('/profile')

    return { success: true }
  } catch (error: any) {
    console.error('ユーザー設定更新エラー:', error)
    return {
      success: false,
      error: error.message || 'ユーザー設定の更新に失敗しました',
    }
  }
}
