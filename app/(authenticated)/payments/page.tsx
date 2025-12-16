import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { PaymentListClient } from '@/components/payments/PaymentListClient'

async function PaymentList() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: payments } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:billing_invoices(invoice_number, client:clients(name)),
      purchase_order:purchase_orders(order_number, supplier:clients(name))
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('payment_date', { ascending: false })

  return (
    <>
      <div className="mb-4 flex justify-end space-x-2">
        <Link
          href="/payments/new?type=receipt"
          className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600"
        >
          入金登録
        </Link>
        <Link
          href="/payments/new?type=payment"
          className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600"
        >
          支払登録
        </Link>
      </div>

      <PaymentListClient payments={payments || []} />
    </>
  )
}

export default async function PaymentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // 管理者のみアクセス可能
  if (!['admin', 'super_admin', 'manager'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">入出金管理</h1>
        <p className="text-gray-600">
          入金・支払の記録と管理を行います
        </p>
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
    </div>
  )
}