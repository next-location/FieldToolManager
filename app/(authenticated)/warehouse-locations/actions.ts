'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createWarehouseLocation(formData: FormData) {
  const supabase = await createClient()

  const code = formData.get('code') as string
  const displayName = formData.get('display_name') as string
  const description = formData.get('description') as string
  const generateQR = formData.get('generate_qr') === 'on'

  // ユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    throw new Error('ユーザー情報が見つかりません')
  }

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    throw new Error('権限がありません')
  }

  // 階層レベルを計算（コードの'-'の数から）
  const level = code.split('-').length

  // QRコード生成
  const qrCode = generateQR ? crypto.randomUUID() : null

  // 登録処理
  const { error } = await supabase.from('warehouse_locations').insert({
    organization_id: userData?.organization_id,
    code,
    display_name: displayName,
    description: description || null,
    level,
    qr_code: qrCode,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('この位置コードは既に登録されています')
    }
    throw new Error(`登録に失敗しました: ${error.message}`)
  }

  revalidatePath('/warehouse-locations')
  redirect('/warehouse-locations')
}

export async function deleteWarehouseLocation(id: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('認証が必要です')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    throw new Error('権限がありません')
  }

  // 論理削除
  const { error } = await supabase
    .from('warehouse_locations')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`削除に失敗しました: ${error.message}`)
  }

  revalidatePath('/warehouse-locations')
}
