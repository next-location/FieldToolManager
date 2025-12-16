import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PaymentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  console.log('[PAYMENT DETAIL] Page component called')
  const { id } = await params
  console.log('[PAYMENT DETAIL] Payment ID:', id)

  const supabase = await createClient()
  console.log('[PAYMENT DETAIL] Supabase client created')

  const { data: { user } } = await supabase.auth.getUser()
  console.log('[PAYMENT DETAIL] User auth result:', { hasUser: !!user })

  if (!user) {
    console.log('[PAYMENT DETAIL] No user, redirecting to login')
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  console.log('[PAYMENT DETAIL] User data:', { role: userData?.role, org_id: userData?.organization_id })

  // マネージャー以上のみアクセス可能
  if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    console.log('[PAYMENT DETAIL] Insufficient permissions, redirecting')
    redirect('/payments')
  }

  // 入出金データを取得
  console.log('[PAYMENT DETAIL] Fetching payment data...')
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .select(`
      *,
      invoice:billing_invoices(
        invoice_number,
        invoice_date,
        due_date,
        total_amount,
        client:clients(name, address, phone)
      ),
      purchase_order:purchase_orders(
        order_number,
        order_date,
        delivery_date,
        total_amount,
        supplier:clients!purchase_orders_supplier_id_fkey(name, address, phone)
      ),
      recorded_by_user:users!payments_recorded_by_fkey(name)
    `)
    .eq('id', id)
    .eq('organization_id', userData?.organization_id)
    .single()

  console.log('[PAYMENT DETAIL] Payment query result:', {
    hasPayment: !!payment,
    error: paymentError,
    paymentType: payment?.payment_type
  })

  if (!payment) {
    console.log('[PAYMENT DETAIL] No payment found, redirecting')
    redirect('/payments')
  }

  const isReceipt = payment.payment_type === 'receipt'
  const relatedDoc = isReceipt ? payment.invoice : payment.purchase_order
  const client = isReceipt ? payment.invoice?.client : payment.purchase_order?.supplier

  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">入出金詳細</h1>
            <p className="text-gray-600">
              {isReceipt ? '入金' : '支払'}記録の詳細情報
            </p>
          </div>
          <div className="flex space-x-2">
            {isReceipt && (
              <a
                href={`/api/payments/${id}/receipt`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
              >
                領収書発行
              </a>
            )}
            <Link
              href={`/payments/${id}/edit`}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              編集
            </Link>
            <Link
              href="/payments"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
            >
              一覧に戻る
            </Link>
          </div>
        </div>
      </div>

      {/* 基本情報 */}
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              種別
            </label>
            <div>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                isReceipt
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {isReceipt ? '入金' : '出金'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              入出金日
            </label>
            <p className="text-gray-900 font-medium">
              {new Date(payment.payment_date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'short'
              })}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              金額
            </label>
            <p className={`text-2xl font-bold ${
              isReceipt ? 'text-green-600' : 'text-red-600'
            }`}>
              {isReceipt ? '+' : '-'}¥{payment.amount.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              支払方法
            </label>
            <p className="text-gray-900">
              {payment.payment_method === 'bank_transfer' ? '銀行振込'
                : payment.payment_method === 'cash' ? '現金'
                : payment.payment_method === 'check' ? '小切手'
                : payment.payment_method === 'credit_card' ? 'クレジットカード'
                : 'その他'}
            </p>
          </div>

          {payment.reference_number && (
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                参照番号
              </label>
              <p className="text-gray-900">{payment.reference_number}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              登録者
            </label>
            <p className="text-gray-900">
              {payment.recorded_by_user?.name || '不明'}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-500 mb-1">
              登録日時
            </label>
            <p className="text-gray-900">
              {new Date(payment.created_at).toLocaleString('ja-JP')}
            </p>
          </div>
        </div>

        {payment.notes && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              備考
            </label>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">{payment.notes}</p>
            </div>
          </div>
        )}
      </div>

      {/* 取引先情報 */}
      {client && (
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">取引先情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                取引先名
              </label>
              <p className="text-gray-900 font-medium">{client.name}</p>
            </div>

            {client.address && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  住所
                </label>
                <p className="text-gray-900">{client.address}</p>
              </div>
            )}

            {client.phone && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  電話番号
                </label>
                <p className="text-gray-900">{client.phone}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 関連帳票情報 */}
      {relatedDoc && (
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">関連帳票</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                帳票番号
              </label>
              <p className="text-gray-900 font-medium">
                {isReceipt
                  ? `請求書: ${payment.invoice?.invoice_number}`
                  : `発注書: ${payment.purchase_order?.order_number}`}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                発行日
              </label>
              <p className="text-gray-900">
                {new Date(
                  isReceipt
                    ? payment.invoice?.invoice_date
                    : payment.purchase_order?.order_date
                ).toLocaleDateString('ja-JP')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                {isReceipt ? '支払期日' : '納期'}
              </label>
              <p className="text-gray-900">
                {new Date(
                  isReceipt
                    ? payment.invoice?.due_date
                    : payment.purchase_order?.delivery_date
                ).toLocaleDateString('ja-JP')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                帳票金額
              </label>
              <p className="text-gray-900 text-lg font-semibold">
                ¥{relatedDoc.total_amount.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Link
              href={isReceipt ? `/invoices/${payment.invoice_id}` : `/purchase-orders/${payment.purchase_order_id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {isReceipt ? '請求書を表示 →' : '発注書を表示 →'}
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}