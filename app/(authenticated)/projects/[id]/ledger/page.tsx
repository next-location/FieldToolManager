import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function ProjectLedgerContent({ projectId }: { projectId: string }) {
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

  // 工事情報を取得
  const { data: project } = await supabase
    .from('projects')
    .select(`
      *,
      client:clients(name)
    `)
    .eq('id', projectId)
    .eq('organization_id', userData?.organization_id)
    .single()

  if (!project) {
    redirect('/projects')
  }

  // 売上データ（見積書・請求書）
  const { data: estimates } = await supabase
    .from('estimates')
    .select('id, estimate_number, estimate_date, total_amount, status')
    .eq('project_id', projectId)
    .eq('organization_id', userData?.organization_id)
    .order('estimate_date', { ascending: false })

  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select('id, invoice_number, invoice_date, total_amount, paid_amount, status')
    .eq('project_id', projectId)
    .eq('organization_id', userData?.organization_id)
    .order('invoice_date', { ascending: false })

  // 原価データ（発注書）
  const { data: purchaseOrders } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      order_date,
      total_amount,
      paid_amount,
      status,
      supplier:clients(name)
    `)
    .eq('project_id', projectId)
    .eq('organization_id', userData?.organization_id)
    .order('order_date', { ascending: false })

  // 収支計算
  const totalEstimateAmount = estimates?.reduce((sum, e) => sum + (e.total_amount || 0), 0) || 0
  const totalInvoiceAmount = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0
  const totalReceivedAmount = invoices?.reduce((sum, i) => sum + (i.paid_amount || 0), 0) || 0
  const totalCostAmount = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0
  const totalPaidCost = purchaseOrders?.reduce((sum, po) => sum + (po.paid_amount || 0), 0) || 0

  const expectedProfit = totalInvoiceAmount - totalCostAmount
  const actualProfit = totalReceivedAmount - totalPaidCost
  const profitRate = totalInvoiceAmount > 0 ? (expectedProfit / totalInvoiceAmount) * 100 : 0

  return (
    <div>
      {/* 工事情報ヘッダー */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold mb-2">{project.project_name}</h1>
            <p className="text-gray-600 mb-1">工事コード: {project.project_code}</p>
            <p className="text-gray-600 mb-1">発注者: {project.client?.name}</p>
            <p className="text-gray-600">
              工期: {new Date(project.start_date).toLocaleDateString('ja-JP')} 〜
              {project.end_date ? new Date(project.end_date).toLocaleDateString('ja-JP') : '未定'}
            </p>
          </div>
          <div className="text-right">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              project.status === 'planning' ? 'bg-gray-100 text-gray-800' :
              project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
              project.status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-red-100 text-red-800'
            }`}>
              {project.status === 'planning' ? '計画中' :
               project.status === 'in_progress' ? '進行中' :
               project.status === 'completed' ? '完了' : project.status}
            </span>
          </div>
        </div>
      </div>

      {/* 収支サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">予算</p>
          <p className="text-2xl font-bold text-gray-900">
            ¥{(project.budget_amount || 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">売上（請求額）</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{totalInvoiceAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">入金: ¥{totalReceivedAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">原価（発注額）</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{totalCostAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">支払: ¥{totalPaidCost.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">粗利益</p>
          <p className={`text-2xl font-bold ${expectedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{expectedProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">粗利率: {profitRate.toFixed(1)}%</p>
        </div>
      </div>

      {/* 予算実績対比 */}
      {project.budget_amount && (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">予算実績対比</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">売上進捗</span>
                <span className="text-sm text-gray-600">
                  ¥{totalInvoiceAmount.toLocaleString()} / ¥{project.budget_amount.toLocaleString()}
                  ({((totalInvoiceAmount / project.budget_amount) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${Math.min((totalInvoiceAmount / project.budget_amount) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">原価進捗</span>
                <span className="text-sm text-gray-600">
                  ¥{totalCostAmount.toLocaleString()} / ¥{project.budget_amount.toLocaleString()}
                  ({((totalCostAmount / project.budget_amount) * 100).toFixed(1)}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${
                    (totalCostAmount / project.budget_amount) > 0.9 ? 'bg-red-600' : 'bg-orange-600'
                  }`}
                  style={{ width: `${Math.min((totalCostAmount / project.budget_amount) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 見積書一覧 */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">見積書</h2>
          <Link
            href={`/estimates/new?project_id=${projectId}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + 新規作成
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">見積番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">見積日</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">金額</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates?.map((estimate) => (
                <tr key={estimate.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link href={`/estimates/${estimate.id}`} className="text-blue-600 hover:text-blue-800">
                      {estimate.estimate_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(estimate.estimate_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    ¥{(estimate.total_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      estimate.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                      estimate.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                      estimate.status === 'accepted' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {estimate.status === 'draft' ? '下書き' :
                       estimate.status === 'sent' ? '送付済' :
                       estimate.status === 'accepted' ? '承認済' : estimate.status}
                    </span>
                  </td>
                </tr>
              ))}
              {(!estimates || estimates.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    見積書がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 請求書一覧 */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">請求書</h2>
          <Link
            href={`/invoices/new?project_id=${projectId}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + 新規作成
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求日</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">請求金額</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">入金済</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未回収</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {invoices?.map((invoice) => {
                const remaining = invoice.total_amount - (invoice.paid_amount || 0)
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      ¥{invoice.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      ¥{(invoice.paid_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-orange-600">
                      ¥{remaining.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        remaining <= 0 ? 'bg-green-100 text-green-800' :
                        invoice.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {remaining <= 0 ? '入金済' :
                         invoice.status === 'draft' ? '下書き' : '未入金'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    請求書がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 発注書一覧（原価） */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">発注書（原価）</h2>
          <Link
            href={`/purchase-orders/new?project_id=${projectId}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            + 新規作成
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注日</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">発注金額</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">支払済</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未払額</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ステータス</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {purchaseOrders?.map((po) => {
                const remaining = po.total_amount - (po.paid_amount || 0)
                return (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{Array.isArray(po.supplier) ? (po.supplier[0] as any)?.name : (po.supplier as any)?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {new Date(po.order_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      ¥{po.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-green-600">
                      ¥{(po.paid_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-orange-600">
                      ¥{remaining.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        remaining <= 0 ? 'bg-green-100 text-green-800' :
                        po.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {remaining <= 0 ? '支払済' :
                         po.status === 'draft' ? '下書き' : '未払'}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {(!purchaseOrders || purchaseOrders.length === 0) && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    発注書がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default async function ProjectLedgerPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ProjectLedgerContent projectId={id} />
      </Suspense>
    </div>
  )
}
