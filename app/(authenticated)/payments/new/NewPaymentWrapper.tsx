import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NewPaymentClient from './NewPaymentClient'

export default async function NewPaymentWrapper() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // マネージャー以上のみアクセス可能
  if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/invoices')
  }

  return <NewPaymentClient />
}