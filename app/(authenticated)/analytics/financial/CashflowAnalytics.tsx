import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'

export default async function CashflowAnalytics() {
  const { organizationId, userRole, supabase } = await requireAuth()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userRole)) {
    redirect('/')
  }

  // パッケージチェック（現場DX業務効率化パック必須）
  const features = await getOrganizationFeatures(organizationId)
  if (!hasPackage(features, 'dx')) {
    const currentPackage = features.package_type as 'asset' | 'dx' | 'none'
    return <PackageRequired packageType="dx" featureName="売上分析・未収未払管理" userRole={userRole} currentPackage={currentPackage} />
  }

  // 未収・未払データを取得
  const today = new Date()

  // 未収請求書（未入金の請求書）
  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      due_date,
      total_amount,
      paid_amount,
      client:clients(name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  // 未払い発注書（支払期限フィールドがないため、未払い総額のみ表示）
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      order_number,
      order_date,
      total_amount,
      paid_amount,
      client:clients(name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('order_date', { ascending: false })

  // 入金済み実績（過去3ヶ月）
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { data: receivedPayments } = await supabase
    .from('payments')
    .select('payment_date, amount, payment_type')
    .eq('organization_id', organizationId)
    .eq('payment_type', 'receipt')
    .gte('payment_date', threeMonthsAgo.toISOString())

  const { data: paidPayments } = await supabase
    .from('payments')
    .select('payment_date, amount, payment_type')
    .eq('organization_id', organizationId)
    .eq('payment_type', 'payment')
    .gte('payment_date', threeMonthsAgo.toISOString())

  // 未収請求書を期限別に集計
  const monthlyReceivables: any = {}

  ;(invoices || []).forEach((invoice) => {
    const remaining = invoice.total_amount - (invoice.paid_amount || 0)
    if (remaining <= 0) return

    const dueDate = new Date(invoice.due_date)
    const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyReceivables[monthKey]) {
      monthlyReceivables[monthKey] = {
        month: monthKey,
        amount: 0,
        items: []
      }
    }

    monthlyReceivables[monthKey].amount += remaining
    monthlyReceivables[monthKey].items.push({
      id: invoice.id,
      number: invoice.invoice_number,
      date: invoice.due_date,
      amount: remaining,
      client: Array.isArray(invoice.client) ? (invoice.client[0] as any)?.name : (invoice.client as any)?.name
    })
  })

  const receivablesArray = Object.values(monthlyReceivables).sort((a: any, b: any) =>
    a.month.localeCompare(b.month)
  )

  // 未払い発注書の総額計算（期限別集計はできない）
  const totalUnpaidPurchaseOrders = (purchaseOrders || []).reduce((sum, po) => {
    const remaining = po.total_amount - (po.paid_amount || 0)
    return sum + (remaining > 0 ? remaining : 0)
  }, 0)

  // 実績キャッシュフローを計算（過去3ヶ月）
  const actualCashflow = (receivedPayments || []).reduce((sum, p) => sum + p.amount, 0) -
    (paidPayments || []).reduce((sum, p) => sum + p.amount, 0)

  // サマリー計算
  const totalUnpaidInvoices = (invoices || []).reduce((sum, inv) => {
    const remaining = inv.total_amount - (inv.paid_amount || 0)
    return sum + (remaining > 0 ? remaining : 0)
  }, 0)

  const unpaidInvoiceCount = (invoices || []).filter(inv =>
    (inv.total_amount - (inv.paid_amount || 0)) > 0
  ).length

  const unpaidPurchaseOrderCount = (purchaseOrders || []).filter(po =>
    (po.total_amount - (po.paid_amount || 0)) > 0
  ).length

  // 当月のデータ
  const thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const thisMonthData = monthlyReceivables[thisMonthKey] || {
    amount: 0,
    items: []
  }

  return (
    <div>
      {/* 全体サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">未収金額（請求書）</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">
            ¥{totalUnpaidInvoices.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            未入金請求書 {unpaidInvoiceCount}件
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">未払金額（発注書）</p>
          <p className="text-lg sm:text-2xl font-bold text-orange-600">
            ¥{totalUnpaidPurchaseOrders.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            未払い発注書 {unpaidPurchaseOrderCount}件
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">差額（未収-未払）</p>
          <p className={`text-lg sm:text-2xl font-bold ${(totalUnpaidInvoices - totalUnpaidPurchaseOrders) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{(totalUnpaidInvoices - totalUnpaidPurchaseOrders).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
          <p className="text-xs sm:text-sm text-gray-600 mb-1">当月期限の未収金</p>
          <p className="text-lg sm:text-2xl font-bold text-blue-600">
            ¥{thisMonthData.amount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {thisMonthData.items?.length || 0}件
          </p>
        </div>
      </div>

      {/* 実績キャッシュフロー（過去3ヶ月） */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">実績キャッシュフロー（過去3ヶ月）</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="border rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">実績入金額</p>
            <p className="text-lg sm:text-xl font-bold text-green-600">
              ¥{((receivedPayments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
            </p>
          </div>
          <div className="border rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">実績支払額</p>
            <p className="text-lg sm:text-xl font-bold text-orange-600">
              ¥{((paidPayments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
            </p>
          </div>
          <div className="border rounded-lg p-3 sm:p-4">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">実績キャッシュフロー</p>
            <p className={`text-lg sm:text-xl font-bold ${actualCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{actualCashflow.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 期限別未収金 */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">期限別未収金（請求書）</h2>

        {receivablesArray.length === 0 ? (
          <p className="text-gray-500 text-center py-8">未収金はありません</p>
        ) : (
          <>
            {/* スマホ: カードレイアウト */}
            <div className="space-y-3 sm:hidden">
              {receivablesArray.map((month: any) => (
                <div key={month.month} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b">
                    <span className="font-bold text-gray-900">{month.month}</span>
                    <div className="text-xs text-gray-500">{month.items.length}件</div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">期限到来金額</span>
                    <span className="font-bold text-blue-600">¥{month.amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* PC: テーブルレイアウト */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">入金期限月</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未収金額</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">請求書件数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {receivablesArray.map((month: any) => (
                    <tr key={month.month} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{month.month}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600 font-bold">
                        ¥{month.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                        {month.items.length}件
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* 未払い発注書情報 */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6 mb-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">未払い発注書</h2>
        <div className="border rounded-lg p-4 bg-orange-50">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600 mb-1">未払い総額</p>
              <p className="text-2xl font-bold text-orange-600">¥{totalUnpaidPurchaseOrders.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 mb-1">未払い件数</p>
              <p className="text-xl font-bold text-gray-900">{unpaidPurchaseOrderCount}件</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ※ 発注書には支払期限が設定されていないため、月別の集計はできません。入出金管理ページから支払記録を登録してください。
          </p>
        </div>
      </div>

      {/* 入金予定カレンダー */}
      <div className="bg-white rounded-lg shadow-sm p-3 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4">入金予定（期限順）</h2>
        {receivablesArray.length === 0 ? (
          <p className="text-gray-500 text-center py-8">入金予定はありません</p>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {receivablesArray.slice(0, 3).map((month: any) => (
              <div key={month.month} className="border rounded-lg p-3 sm:p-4">
                <h3 className="font-bold mb-2 sm:mb-3 text-sm sm:text-base">{month.month}</h3>

                {/* 入金予定 */}
                <div>
                  <p className="text-xs sm:text-sm font-medium text-blue-600 mb-2">未入金請求書</p>
                  <div className="space-y-1">
                    {month.items.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="text-xs sm:text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center py-1 border-b gap-1">
                        <span className="text-gray-600">
                          {new Date(item.date).toLocaleDateString('ja-JP')} - {item.client} ({item.number})
                        </span>
                        <span className="font-medium text-blue-600">¥{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {month.items.length > 5 && (
                      <p className="text-xs text-gray-500 pt-1">他 {month.items.length - 5}件</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {receivablesArray.length > 3 && (
              <p className="text-sm text-gray-500 text-center">他 {receivablesArray.length - 3}ヶ月分</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
