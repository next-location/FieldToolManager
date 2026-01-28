import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'
import CashflowChart from './CashflowChart'

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
    return <PackageRequired packageType="dx" featureName="売上分析・資金繰り予測" userRole={userRole} currentPackage={currentPackage} />
  }

  // 今日から6ヶ月先までのデータを取得
  const today = new Date()
  const sixMonthsLater = new Date()
  sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6)

  // 入金予定（請求書）
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
    .lte('due_date', sixMonthsLater.toISOString())
    .order('due_date', { ascending: true })

  // 支払予定（発注書）
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      order_date,
      payment_due_date,
      total_amount,
      paid_amount,
      supplier:clients(name)
    `)
    .eq('organization_id', organizationId)
    .lte('payment_due_date', sixMonthsLater.toISOString())
    .order('payment_due_date', { ascending: true })

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

  // 月別入出金予測を計算
  const monthlyForecast: any = {}

  // 入金予定を月別に集計
  ;(invoices || []).forEach((invoice) => {
    const remaining = invoice.total_amount - (invoice.paid_amount || 0)
    if (remaining <= 0) return

    const dueDate = new Date(invoice.due_date)
    const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyForecast[monthKey]) {
      monthlyForecast[monthKey] = {
        month: monthKey,
        expectedIncome: 0,
        expectedExpense: 0,
        netCashflow: 0,
        incomeItems: [],
        expenseItems: []
      }
    }

    monthlyForecast[monthKey].expectedIncome += remaining
    monthlyForecast[monthKey].incomeItems.push({
      id: invoice.id,
      number: invoice.invoice_number,
      date: invoice.due_date,
      amount: remaining,
      client: Array.isArray(invoice.client) ? (invoice.client[0] as any)?.name : (invoice.client as any)?.name
    })
  })

  // 支払予定を月別に集計
  ;(purchaseOrders || []).forEach((po) => {
    const remaining = po.total_amount - (po.paid_amount || 0)
    if (remaining <= 0) return

    const dueDate = new Date(po.payment_due_date)
    const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`

    if (!monthlyForecast[monthKey]) {
      monthlyForecast[monthKey] = {
        month: monthKey,
        expectedIncome: 0,
        expectedExpense: 0,
        netCashflow: 0,
        incomeItems: [],
        expenseItems: []
      }
    }

    monthlyForecast[monthKey].expectedExpense += remaining
    monthlyForecast[monthKey].expenseItems.push({
      id: po.id,
      number: po.po_number,
      date: po.payment_due_date,
      amount: remaining,
      supplier: Array.isArray(po.supplier) ? (po.supplier[0] as any)?.name : (po.supplier as any)?.name
    })
  })

  // キャッシュフローを計算
  Object.keys(monthlyForecast).forEach((key) => {
    monthlyForecast[key].netCashflow =
      monthlyForecast[key].expectedIncome - monthlyForecast[key].expectedExpense
  })

  const forecastArray = Object.values(monthlyForecast).sort((a: any, b: any) =>
    a.month.localeCompare(b.month)
  )

  // 実績キャッシュフローを計算（過去3ヶ月）
  const actualCashflow = (receivedPayments || []).reduce((sum, p) => sum + p.amount, 0) -
    (paidPayments || []).reduce((sum, p) => sum + p.amount, 0)

  // サマリー計算
  const totalExpectedIncome = forecastArray.reduce((sum: number, m: any) => sum + m.expectedIncome, 0)
  const totalExpectedExpense = forecastArray.reduce((sum: number, m: any) => sum + m.expectedExpense, 0)
  const totalNetCashflow = totalExpectedIncome - totalExpectedExpense

  // 当月のデータ
  const thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  const thisMonthData = monthlyForecast[thisMonthKey] || {
    expectedIncome: 0,
    expectedExpense: 0,
    netCashflow: 0
  }

  return (
    <div>
      {/* 全体サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">予想入金額（6ヶ月）</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{totalExpectedIncome.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            請求書 {(invoices || []).filter(i => i.total_amount - (i.paid_amount || 0) > 0).length}件
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">予想支払額（6ヶ月）</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{totalExpectedExpense.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            発注書 {(purchaseOrders || []).filter(po => po.total_amount - (po.paid_amount || 0) > 0).length}件
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">予想キャッシュフロー</p>
          <p className={`text-2xl font-bold ${totalNetCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{totalNetCashflow.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">当月キャッシュフロー</p>
          <p className={`text-2xl font-bold ${thisMonthData.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{thisMonthData.netCashflow.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            入: ¥{thisMonthData.expectedIncome.toLocaleString()} /
            出: ¥{thisMonthData.expectedExpense.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 実績キャッシュフロー（過去3ヶ月） */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">実績キャッシュフロー（過去3ヶ月）</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">実績入金額</p>
            <p className="text-xl font-bold text-green-600">
              ¥{((receivedPayments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">実績支払額</p>
            <p className="text-xl font-bold text-orange-600">
              ¥{((paidPayments || []).reduce((sum, p) => sum + p.amount, 0)).toLocaleString()}
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">実績キャッシュフロー</p>
            <p className={`text-xl font-bold ${actualCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ¥{actualCashflow.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* 月別資金繰り予測 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">月別資金繰り予測</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">年月</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">予想入金</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">予想支払</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">キャッシュフロー</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">入金件数</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">支払件数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {forecastArray.map((month: any) => (
                <tr key={month.month} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{month.month}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600">
                    ¥{month.expectedIncome.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-orange-600">
                    ¥{month.expectedExpense.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-right font-bold ${
                    month.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ¥{month.netCashflow.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                    {month.incomeItems.length}件
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                    {month.expenseItems.length}件
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

      {/* キャッシュフロー推移グラフ */}
      <CashflowChart data={forecastArray as any} />

      {/* 入出金予定カレンダー */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">入出金予定カレンダー</h2>
        <div className="space-y-6">
          {forecastArray.slice(0, 3).map((month: any) => (
            <div key={month.month} className="border rounded-lg p-4">
              <h3 className="font-bold mb-3">{month.month}</h3>

              {/* 入金予定 */}
              {month.incomeItems.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-blue-600 mb-2">入金予定</p>
                  <div className="space-y-1">
                    {month.incomeItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="text-sm flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600">
                          {new Date(item.date).toLocaleDateString('ja-JP')} - {item.client}
                        </span>
                        <span className="font-medium text-blue-600">¥{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {month.incomeItems.length > 5 && (
                      <p className="text-xs text-gray-500 pt-1">他 {month.incomeItems.length - 5}件</p>
                    )}
                  </div>
                </div>
              )}

              {/* 支払予定 */}
              {month.expenseItems.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-orange-600 mb-2">支払予定</p>
                  <div className="space-y-1">
                    {month.expenseItems.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="text-sm flex justify-between items-center py-1 border-b">
                        <span className="text-gray-600">
                          {new Date(item.date).toLocaleDateString('ja-JP')} - {item.supplier}
                        </span>
                        <span className="font-medium text-orange-600">¥{item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                    {month.expenseItems.length > 5 && (
                      <p className="text-xs text-gray-500 pt-1">他 {month.expenseItems.length - 5}件</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
