import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PaymentListClient } from '@/components/payments/PaymentListClient'
import { requireAuth } from '@/lib/auth/page-auth'
import PaymentPageFAB from '@/components/payments/PaymentPageFAB'

async function PaymentList() {
  const { organizationId, supabase } = await requireAuth()

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:billing_invoices(invoice_number, client:clients(name)),
      purchase_order:purchase_orders(order_number, supplier:clients!purchase_orders_client_id_fkey(name))
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })

  return <PaymentListClient payments={payments || []} />
}

export default async function PaymentsPage() {
  const { userRole } = await requireAuth()

  // 管理者のみアクセス可能
  if (!['admin', 'super_admin', 'manager'].includes(userRole)) {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">入出金管理</h1>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            入金・支払の記録と管理を行います
          </p>
          <div className="hidden sm:flex gap-3">
            <Link
              href="/payments/new?type=receipt"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              + 入金登録
            </Link>
            <Link
              href="/payments/new?type=payment"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
            >
              + 支払登録
            </Link>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          }
        >
          <PaymentList />
        </Suspense>

        <PaymentPageFAB />
      </div>
    </div>
  )
}