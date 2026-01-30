import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { PaymentScheduleClient } from './PaymentScheduleClient'

async function PaymentScheduleContent() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userRole || '')) {
    redirect('/')
  }

  // 未払いの発注書を支払期日順に取得
  const { data: paymentSchedule } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      order_date,
      delivery_due_date,
      payment_due_date,
      total_amount,
      paid_amount,
      status,
      supplier:clients(name)
    `)
    .eq('organization_id', organizationId)
    .neq('status', 'cancelled')
    .order('payment_due_date', { ascending: true})

  return <PaymentScheduleClient paymentSchedule={paymentSchedule || []} />
}

export default async function PaymentSchedulePage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <Suspense fallback={<LoadingSpinner inline />}>
          <PaymentScheduleContent />
        </Suspense>
      </div>
    </div>
  )
}
