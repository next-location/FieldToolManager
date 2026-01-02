import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import NewPaymentClient from './NewPaymentClient'

export default async function NewPaymentWrapper() {
  const { userRole } = await requireAuth()

  // マネージャー以上のみアクセス可能
  if (!['manager', 'admin', 'super_admin'].includes(userRole)) {
    redirect('/invoices')
  }

  return <NewPaymentClient />
}