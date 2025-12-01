'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createMovement(formData: FormData) {
  const supabase = await createClient()

  const tool_id = formData.get('tool_id') as string
  const movement_type = formData.get('movement_type') as string
  const from_site_id = formData.get('from_site_id') as string | null
  const to_site_id = formData.get('to_site_id') as string | null
  const quantity = parseInt(formData.get('quantity') as string)
  const notes = formData.get('notes') as string

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

  // 移動を登録
  const { error } = await supabase.from('tool_movements').insert({
    organization_id: userData.organization_id,
    tool_id,
    movement_type,
    from_location: from_site_id ? 'site' : 'warehouse',
    to_location: to_site_id ? 'site' : 'warehouse',
    from_site_id: from_site_id || null,
    to_site_id: to_site_id || null,
    quantity,
    performed_by: user.id,
    notes: notes || null,
  })

  if (error) {
    throw new Error(`移動の登録に失敗しました: ${error.message}`)
  }

  // 道具の現在地を更新
  let updateData: any = {}

  if (movement_type === 'check_out' && to_site_id) {
    updateData = {
      current_location: 'site',
      current_site_id: to_site_id,
      status: 'in_use',
    }
  } else if (movement_type === 'check_in') {
    updateData = {
      current_location: 'warehouse',
      current_site_id: null,
      status: 'available',
    }
  } else if (movement_type === 'transfer' && to_site_id) {
    updateData = {
      current_location: 'site',
      current_site_id: to_site_id,
      status: 'in_use',
    }
  } else if (movement_type === 'repair') {
    updateData = {
      current_location: 'repair',
      status: 'maintenance',
    }
  } else if (movement_type === 'return_from_repair') {
    updateData = {
      current_location: 'warehouse',
      current_site_id: null,
      status: 'available',
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('tools')
      .update(updateData)
      .eq('id', tool_id)

    if (updateError) {
      throw new Error(`道具の状態更新に失敗しました: ${updateError.message}`)
    }
  }

  revalidatePath('/movements')
  revalidatePath('/tools')
  revalidatePath(`/tools/${tool_id}`)
  redirect('/movements')
}
