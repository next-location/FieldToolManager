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

  // æü¶üÅ1hDTID’Ö—
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
    throw new Error('æü¶üÅ1L‹dKŠ~[“')
  }

  // ¡)PÁ§Ã¯
  if (!['admin', 'super_admin'].includes(userData.role)) {
    throw new Error(')PLBŠ~[“')
  }

  // dìÙë’—³üÉnÏ¤Õóp+1	
  const level = code.split('-').length

  // QR³üÉ’
  const qrCode = generateQR ? crypto.randomUUID() : null

  // 	«Mn’\
  const { error } = await supabase.from('warehouse_locations').insert({
    organization_id: userData.organization_id,
    code,
    display_name: displayName,
    description: description || null,
    level,
    qr_code: qrCode,
  })

  if (error) {
    if (error.code === '23505') {
      throw new Error('XMn³üÉLYgkX(W~Y')
    }
    throw new Error(`{2k1WW~W_: ${error.message}`)
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
    throw new Error('<LÅgY')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!userData || !['admin', 'super_admin'].includes(userData.role)) {
    throw new Error(')PLBŠ~[“')
  }

  // ÖJd
  const { error } = await supabase
    .from('warehouse_locations')
    .update({
      deleted_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    throw new Error(`Jdk1WW~W_: ${error.message}`)
  }

  revalidatePath('/warehouse-locations')
}
