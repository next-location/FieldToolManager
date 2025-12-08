import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

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
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">入出金一覧</h2>
        <div className="space-x-2">
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
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日付
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種別
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                取引先
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                関連帳票
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                支払方法
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                備考
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {payments?.map((payment) => {
              const isReceipt = payment.payment_type === 'receipt'
              const relatedDoc = isReceipt ? payment.invoice : payment.purchase_order
              const clientName = isReceipt
                ? payment.invoice?.client?.name
                : payment.purchase_order?.supplier?.name

              return (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(payment.payment_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                      isReceipt
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isReceipt ? '入金' : '支払'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {clientName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {isReceipt && payment.invoice
                      ? `請求書: ${payment.invoice.invoice_number}`
                      : !isReceipt && payment.purchase_order
                      ? `発注書: ${payment.purchase_order.order_number}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.payment_method === 'bank_transfer' ? '銀行振込'
                      : payment.payment_method === 'cash' ? '現金'
                      : payment.payment_method === 'check' ? '小切手'
                      : payment.payment_method === 'credit_card' ? 'クレジットカード'
                      : 'その他'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <span className={isReceipt ? 'text-green-600' : 'text-red-600'}>
                      {isReceipt ? '+' : '-'}¥{payment.amount.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {payment.notes ? (
                      <span className="truncate block max-w-xs" title={payment.notes}>
                        {payment.notes}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/payments/${payment.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/payments/${payment.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      編集
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {(!payments || payments.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            入出金データがありません
          </div>
        )}
      </div>

      {/* 集計 */}
      {payments && payments.length > 0 && (
        <div className="px-6 py-4 border-t bg-gray-50">
          <div className="flex justify-end space-x-6 text-sm">
            <div>
              <span className="text-gray-500">入金合計:</span>
              <span className="ml-2 font-semibold text-green-600">
                ¥{payments
                  .filter(p => p.payment_type === 'receipt')
                  .reduce((sum, p) => sum + Number(p.amount), 0)
                  .toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">支払合計:</span>
              <span className="ml-2 font-semibold text-red-600">
                ¥{payments
                  .filter(p => p.payment_type === 'payment')
                  .reduce((sum, p) => sum + Number(p.amount), 0)
                  .toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">収支:</span>
              <span className={`ml-2 font-semibold ${
                payments.reduce((sum, p) =>
                  p.payment_type === 'receipt'
                    ? sum + Number(p.amount)
                    : sum - Number(p.amount), 0) >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}>
                ¥{payments
                  .reduce((sum, p) =>
                    p.payment_type === 'receipt'
                      ? sum + Number(p.amount)
                      : sum - Number(p.amount), 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
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