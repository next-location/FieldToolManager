'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { verifySessionToken } from '@/lib/auth/impersonation'
import { cookies } from 'next/headers'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

type ToolMasterImportData = {
  name: string
  model_number?: string
  manufacturer?: string
  category_id?: string
  unit: string
  minimum_stock: number
  notes?: string
}

/**
 * CSVから道具マスタを一括インポート
 */
export async function importToolMastersFromCSV(toolMasters: ToolMasterImportData[]) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: '認証が必要です' }
  }

  // なりすましログインチェック
  const cookieStore = await cookies()
  const impersonationToken = cookieStore.get('impersonation_session')?.value
  const impersonationSession = impersonationToken
    ? await verifySessionToken(impersonationToken)
    : null

  if (!impersonationSession) {
    return { error: 'この機能はスーパー管理者のなりすましログイン時のみ利用できます' }
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    return { error: 'ユーザー情報が取得できません' }
  }

  // 権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    return { error: '権限がありません' }
  }

  // バリデーション
  const errors: string[] = []
  toolMasters.forEach((tool, index) => {
    if (!tool.name || tool.name.trim() === '') {
      errors.push(`${index + 1}行目: 道具名は必須です`)
    }
    if (tool.minimum_stock < 1) {
      errors.push(`${index + 1}行目: 最小在庫数は1以上である必要があります`)
    }

    // 不審なパターン検出
    if (hasSuspiciousPattern(tool.name)) {
      errors.push(`${index + 1}行目: 道具名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`)
    }
    if (tool.model_number && hasSuspiciousPattern(tool.model_number)) {
      errors.push(`${index + 1}行目: 型番に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`)
    }
    if (tool.manufacturer && hasSuspiciousPattern(tool.manufacturer)) {
      errors.push(`${index + 1}行目: メーカー名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`)
    }
    if (tool.notes && hasSuspiciousPattern(tool.notes)) {
      errors.push(`${index + 1}行目: 備考に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）`)
    }
  })

  if (errors.length > 0) {
    return { error: errors.join('\n') }
  }

  // 一括登録（HTMLエスケープ処理）
  const insertData = toolMasters.map((tool) => ({
    organization_id: userData?.organization_id,
    name: escapeHtml(tool.name.trim()),
    model_number: tool.model_number ? escapeHtml(tool.model_number.trim()) : null,
    manufacturer: tool.manufacturer ? escapeHtml(tool.manufacturer.trim()) : null,
    category_id: tool.category_id || null,
    management_type: 'individual' as const,
    unit: escapeHtml(tool.unit.trim()),
    minimum_stock: tool.minimum_stock,
    notes: tool.notes ? escapeHtml(tool.notes.trim()) : null,
    is_from_preset: false,
  }))

  const { data, error } = await supabase.from('tools').insert(insertData).select()

  if (error) {
    console.error('Error importing tool masters:', error)
    return { error: 'インポートに失敗しました' }
  }

  revalidatePath('/master/tools')
  return { count: data.length }
}
