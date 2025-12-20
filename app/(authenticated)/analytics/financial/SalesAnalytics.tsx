import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'

export default async function SalesAnalytics() {
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

  // パッケージチェック（現場DX業務効率化パック必須）
  if (userData?.organization_id) {
    const features = await getOrganizationFeatures(userData?.organization_id)
    if (!hasPackage(features, 'dx')) {
      return <PackageRequired packageType="dx" featureName="売上分析・資金繰り予測" userRole={userData.role} />
    }
  }

  // 請求書データを取得（過去12ヶ月）
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      total_amount,
      paid_amount,
      status,
      client:clients(id, name),
      project:projects(id, project_name)
    `)
    .eq('organization_id', userData?.organization_id)
    .gte('invoice_date', twelveMonthsAgo.toISOString())
    .order('invoice_date', { ascending: false })

  // 月次売上集計
  const monthlySales = (invoices || []).reduce((acc: any, invoice) => {
    const date = new Date(invoice.invoice_date)
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        totalAmount: 0,
        paidAmount: 0,
        invoiceCount: 0
      }
    }

    acc[monthKey].totalAmount += invoice.total_amount
    acc[monthKey].paidAmount += invoice.paid_amount || 0
    acc[monthKey].invoiceCount += 1

    return acc
  }, {})

  const monthlySalesArray = Object.values(monthlySales).sort((a: any, b: any) =>
    a.month.localeCompare(b.month)
  )

  // 取引先別売上集計
  const clientSales = (invoices || []).reduce((acc: any, invoice) => {
    if (!invoice.client) return acc

    const clientId = invoice.client.id
    if (!acc[clientId]) {
      acc[clientId] = {
        clientId,
        clientName: invoice.client.name,
        totalAmount: 0,
        paidAmount: 0,
        invoiceCount: 0
      }
    }

    acc[clientId].totalAmount += invoice.total_amount
    acc[clientId].paidAmount += invoice.paid_amount || 0
    acc[clientId].invoiceCount += 1

    return acc
  }, {})

  const clientSalesArray = Object.values(clientSales)
    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    .slice(0, 10) // Top 10

  // 工事別売上集計
  const projectSales = (invoices || []).reduce((acc: any, invoice) => {
    if (!invoice.project) return acc

    const projectId = invoice.project.id
    if (!acc[projectId]) {
      acc[projectId] = {
        projectId,
        projectName: invoice.project.project_name,
        totalAmount: 0,
        paidAmount: 0,
        invoiceCount: 0
      }
    }

    acc[projectId].totalAmount += invoice.total_amount
    acc[projectId].paidAmount += invoice.paid_amount || 0
    acc[projectId].invoiceCount += 1

    return acc
  }, {})

  const projectSalesArray = Object.values(projectSales)
    .sort((a: any, b: any) => b.totalAmount - a.totalAmount)
    .slice(0, 10) // Top 10

  // 全体サマリー
  const totalSales = (invoices || []).reduce((sum, inv) => sum + inv.total_amount, 0)
  const totalPaid = (invoices || []).reduce((sum, inv) => sum + (inv.paid_amount || 0), 0)
  const totalUnpaid = totalSales - totalPaid
  const collectionRate = totalSales > 0 ? (totalPaid / totalSales) * 100 : 0

  // 今月のデータ
  const now = new Date()
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthData = monthlySales[thisMonthKey] || { totalAmount: 0, paidAmount: 0, invoiceCount: 0 }

  // 前月のデータ
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`
  const lastMonthData = monthlySales[lastMonthKey] || { totalAmount: 0, paidAmount: 0, invoiceCount: 0 }

  const monthOverMonthChange = lastMonthData.totalAmount > 0
    ? ((thisMonthData.totalAmount - lastMonthData.totalAmount) / lastMonthData.totalAmount) * 100
    : 0

  return (
    <div>
      {/* 全体サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">総売上（12ヶ月）</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{totalSales.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">請求書 {invoices?.length || 0}件</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">入金済</p>
          <p className="text-2xl font-bold text-green-600">
            ¥{totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">回収率: {collectionRate.toFixed(1)}%</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">未回収</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{totalUnpaid.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">今月売上</p>
          <p className="text-2xl font-bold text-gray-900">
            ¥{thisMonthData.totalAmount.toLocaleString()}
          </p>
          <p className={`text-xs mt-1 ${monthOverMonthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            前月比: {monthOverMonthChange >= 0 ? '+' : ''}{monthOverMonthChange.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* 月次売上推移 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">月次売上推移</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">年月</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">請求金額</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">入金済</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未回収</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">回収率</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">請求件数</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {monthlySalesArray.map((month: any) => {
                const unpaid = month.totalAmount - month.paidAmount
                const rate = month.totalAmount > 0 ? (month.paidAmount / month.totalAmount) * 100 : 0
                return (
                  <tr key={month.month} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{month.month}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600">
                      ¥{month.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      ¥{month.paidAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-orange-600">
                      ¥{unpaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-medium ${
                        rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                      {month.invoiceCount}件
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* グラフ表示エリア */}
        <div className="mt-6 h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <p className="text-gray-400">月次推移グラフ（チャートライブラリ統合で実装予定）</p>
        </div>
      </div>

      {/* 取引先別売上 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">取引先別売上 Top 10</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">売上金額</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">入金済</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">回収率</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">請求件数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">構成比</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clientSalesArray.map((client: any, index: number) => {
                const rate = client.totalAmount > 0 ? (client.paidAmount / client.totalAmount) * 100 : 0
                const share = totalSales > 0 ? (client.totalAmount / totalSales) * 100 : 0
                return (
                  <tr key={client.clientId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center font-medium">{index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{client.clientName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600">
                      ¥{client.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      ¥{client.paidAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-medium ${
                        rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                      {client.invoiceCount}件
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                      {share.toFixed(1)}%
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 工事別売上 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">工事別売上 Top 10</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">順位</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">売上金額</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">入金済</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">回収率</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">請求件数</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projectSalesArray.map((project: any, index: number) => {
                const rate = project.totalAmount > 0 ? (project.paidAmount / project.totalAmount) * 100 : 0
                return (
                  <tr key={project.projectId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-center font-medium">{index + 1}</td>
                    <td className="px-6 py-4 font-medium">{project.projectName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600">
                      ¥{project.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      ¥{project.paidAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`font-medium ${
                        rate >= 90 ? 'text-green-600' : rate >= 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {rate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-gray-600">
                      {project.invoiceCount}件
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Link
                        href={`/projects/${project.projectId}/ledger`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        台帳
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
