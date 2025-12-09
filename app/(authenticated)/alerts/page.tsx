import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function AlertsContent() {
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

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sevenDaysLater = new Date(today)
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

  // 支払期日が近い発注書（7日以内）
  const { data: upcomingPayments } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      payment_due_date,
      total_amount,
      paid_amount,
      supplier:clients(name)
    `)
    .eq('organization_id', userData.organization_id)
    .lte('payment_due_date', sevenDaysLater.toISOString())
    .gte('payment_due_date', today.toISOString())
    .order('payment_due_date', { ascending: true })

  // 支払期日超過の発注書
  const { data: overduePayments } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      payment_due_date,
      total_amount,
      paid_amount,
      supplier:clients(name)
    `)
    .eq('organization_id', userData.organization_id)
    .lt('payment_due_date', today.toISOString())
    .order('payment_due_date', { ascending: true })

  // 入金期日が近い請求書（7日以内）
  const { data: upcomingReceipts } = await supabase
    .from('billing_invoices')
    .select(`
      id,
      invoice_number,
      due_date,
      total_amount,
      paid_amount,
      client:clients(name)
    `)
    .eq('organization_id', userData.organization_id)
    .lte('due_date', sevenDaysLater.toISOString())
    .gte('due_date', today.toISOString())
    .order('due_date', { ascending: true })

  // 入金遅延の請求書（期限超過）
  const { data: overdueReceipts } = await supabase
    .from('billing_invoices')
    .select(`
      id,
      invoice_number,
      due_date,
      total_amount,
      paid_amount,
      client:clients(name)
    `)
    .eq('organization_id', userData.organization_id)
    .lt('due_date', today.toISOString())
    .order('due_date', { ascending: true })

  // 未払い発注書のみフィルタ
  const upcomingPaymentsUnpaid = (upcomingPayments || []).filter(
    po => (po.total_amount - (po.paid_amount || 0)) > 0
  )
  const overduePaymentsUnpaid = (overduePayments || []).filter(
    po => (po.total_amount - (po.paid_amount || 0)) > 0
  )

  // 未回収請求書のみフィルタ
  const upcomingReceiptsUnpaid = (upcomingReceipts || []).filter(
    inv => (inv.total_amount - (inv.paid_amount || 0)) > 0
  )
  const overdueReceiptsUnpaid = (overdueReceipts || []).filter(
    inv => (inv.total_amount - (inv.paid_amount || 0)) > 0
  )

  // 遅延日数を計算
  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate)
    const diff = today.getTime() - due.getTime()
    return Math.floor(diff / (1000 * 60 * 60 * 24))
  }

  // 残り日数を計算
  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate)
    const diff = due.getTime() - today.getTime()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // サマリー計算
  const totalOverduePaymentAmount = overduePaymentsUnpaid.reduce(
    (sum, po) => sum + (po.total_amount - (po.paid_amount || 0)), 0
  )
  const totalOverdueReceiptAmount = overdueReceiptsUnpaid.reduce(
    (sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0
  )
  const totalUpcomingPaymentAmount = upcomingPaymentsUnpaid.reduce(
    (sum, po) => sum + (po.total_amount - (po.paid_amount || 0)), 0
  )
  const totalUpcomingReceiptAmount = upcomingReceiptsUnpaid.reduce(
    (sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0
  )

  const totalAlerts =
    overduePaymentsUnpaid.length +
    overdueReceiptsUnpaid.length +
    upcomingPaymentsUnpaid.length +
    upcomingReceiptsUnpaid.length

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">アラート・通知</h1>
        <p className="text-gray-600">支払期日と入金期日のアラート一覧</p>
      </div>

      {/* アラートサマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-6">
          <p className="text-sm text-red-600 mb-1">⚠️ 支払期限超過</p>
          <p className="text-2xl font-bold text-red-700">
            {overduePaymentsUnpaid.length}件
          </p>
          <p className="text-xs text-red-600 mt-1">¥{totalOverduePaymentAmount.toLocaleString()}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-lg shadow-sm p-6">
          <p className="text-sm text-orange-600 mb-1">🔔 支払期日接近</p>
          <p className="text-2xl font-bold text-orange-700">
            {upcomingPaymentsUnpaid.length}件
          </p>
          <p className="text-xs text-orange-600 mt-1">¥{totalUpcomingPaymentAmount.toLocaleString()}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg shadow-sm p-6">
          <p className="text-sm text-red-600 mb-1">⚠️ 入金遅延</p>
          <p className="text-2xl font-bold text-red-700">
            {overdueReceiptsUnpaid.length}件
          </p>
          <p className="text-xs text-red-600 mt-1">¥{totalOverdueReceiptAmount.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm p-6">
          <p className="text-sm text-blue-600 mb-1">📅 入金期日接近</p>
          <p className="text-2xl font-bold text-blue-700">
            {upcomingReceiptsUnpaid.length}件
          </p>
          <p className="text-xs text-blue-600 mt-1">¥{totalUpcomingReceiptAmount.toLocaleString()}</p>
        </div>
      </div>

      {totalAlerts === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <p className="text-green-700 text-lg font-medium">✓ 現在アラートはありません</p>
          <p className="text-green-600 text-sm mt-2">すべての支払い・入金は期限内です</p>
        </div>
      )}

      {/* 支払期限超過 */}
      {overduePaymentsUnpaid.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b px-6 py-4 bg-red-50">
            <h2 className="text-lg font-bold text-red-800">⚠️ 支払期限超過（緊急）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払期日</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">遅延日数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未払額</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {overduePaymentsUnpaid.map((po) => {
                  const remaining = po.total_amount - (po.paid_amount || 0)
                  const daysOverdue = getDaysOverdue(po.payment_due_date)
                  return (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800">
                          {po.po_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{po.supplier?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(po.payment_due_date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          {daysOverdue}日超過
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-red-600">
                        ¥{remaining.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/payments/new?po_id=${po.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          支払登録
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 支払期日接近 */}
      {upcomingPaymentsUnpaid.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b px-6 py-4 bg-orange-50">
            <h2 className="text-lg font-bold text-orange-800">🔔 支払期日接近（7日以内）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払期日</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">残り日数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未払額</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingPaymentsUnpaid.map((po) => {
                  const remaining = po.total_amount - (po.paid_amount || 0)
                  const daysRemaining = getDaysRemaining(po.payment_due_date)
                  return (
                    <tr key={po.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800">
                          {po.po_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{po.supplier?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(po.payment_due_date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-medium">
                          あと{daysRemaining}日
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-orange-600">
                        ¥{remaining.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/payments/new?po_id=${po.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          支払登録
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 入金遅延 */}
      {overdueReceiptsUnpaid.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b px-6 py-4 bg-red-50">
            <h2 className="text-lg font-bold text-red-800">⚠️ 入金遅延（催促推奨）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">入金期日</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">遅延日数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未回収額</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {overdueReceiptsUnpaid.map((inv) => {
                  const remaining = inv.total_amount - (inv.paid_amount || 0)
                  const daysOverdue = getDaysOverdue(inv.due_date)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{inv.client?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(inv.due_date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-medium">
                          {daysOverdue}日超過
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-red-600">
                        ¥{remaining.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/payments/new?invoice_id=${inv.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm mr-2"
                        >
                          入金登録
                        </Link>
                        <button className="text-purple-600 hover:text-purple-900 text-sm">
                          催促メール
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 入金期日接近 */}
      {upcomingReceiptsUnpaid.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b px-6 py-4 bg-blue-50">
            <h2 className="text-lg font-bold text-blue-800">📅 入金期日接近（7日以内）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">入金期日</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">残り日数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未回収額</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {upcomingReceiptsUnpaid.map((inv) => {
                  const remaining = inv.total_amount - (inv.paid_amount || 0)
                  const daysRemaining = getDaysRemaining(inv.due_date)
                  return (
                    <tr key={inv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{inv.client?.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(inv.due_date).toLocaleDateString('ja-JP')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          あと{daysRemaining}日
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-blue-600">
                        ¥{remaining.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <Link
                          href={`/payments/new?invoice_id=${inv.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm"
                        >
                          入金登録
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default async function AlertsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <AlertsContent />
      </Suspense>
    </div>
  )
}
