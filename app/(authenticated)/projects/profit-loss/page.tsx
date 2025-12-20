import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function ProfitLossContent() {
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

  // 全工事を取得
  const { data: projects } = await supabase
    .from('projects')
    .select(`
      id,
      project_name,
      project_code,
      status,
      budget_amount,
      start_date,
      end_date,
      client:clients(name)
    `)
    .eq('organization_id', userData?.organization_id)
    .order('start_date', { ascending: false })

  if (!projects) {
    return <div>データの取得に失敗しました</div>
  }

  // 各工事の収支を計算
  const projectsWithPL = await Promise.all(
    projects.map(async (project) => {
      // 請求書データ
      const { data: invoices } = await supabase
        .from('billing_invoices')
        .select('total_amount, paid_amount')
        .eq('project_id', project.id)
        .eq('organization_id', userData?.organization_id)

      // 発注書データ
      const { data: purchaseOrders } = await supabase
        .from('purchase_orders')
        .select('total_amount, paid_amount')
        .eq('project_id', project.id)
        .eq('organization_id', userData?.organization_id)

      const revenue = invoices?.reduce((sum, i) => sum + (i.total_amount || 0), 0) || 0
      const receivedAmount = invoices?.reduce((sum, i) => sum + (i.paid_amount || 0), 0) || 0
      const cost = purchaseOrders?.reduce((sum, po) => sum + (po.total_amount || 0), 0) || 0
      const paidCost = purchaseOrders?.reduce((sum, po) => sum + (po.paid_amount || 0), 0) || 0

      const profit = revenue - cost
      const profitRate = revenue > 0 ? (profit / revenue) * 100 : 0

      return {
        ...project,
        revenue,
        receivedAmount,
        cost,
        paidCost,
        profit,
        profitRate
      }
    })
  )

  // 全体サマリー
  const totalRevenue = projectsWithPL.reduce((sum, p) => sum + p.revenue, 0)
  const totalCost = projectsWithPL.reduce((sum, p) => sum + p.cost, 0)
  const totalProfit = totalRevenue - totalCost
  const totalProfitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
  const totalReceived = projectsWithPL.reduce((sum, p) => sum + p.receivedAmount, 0)
  const totalPaidCost = projectsWithPL.reduce((sum, p) => sum + p.paidCost, 0)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">工事別損益計算</h1>
        <p className="text-gray-600">全工事の収支状況を一覧表示します</p>
      </div>

      {/* 全体サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">総売上</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">入金: ¥{totalReceived.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">総原価</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{totalCost.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">支払: ¥{totalPaidCost.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">総粗利益</p>
          <p className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ¥{totalProfit.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            実績: ¥{(totalReceived - totalPaidCost).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">平均粗利率</p>
          <p className={`text-2xl font-bold ${totalProfitRate >= 20 ? 'text-green-600' : totalProfitRate >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
            {totalProfitRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* ステータス別フィルタ */}
      <div className="bg-white rounded-lg shadow-sm mb-6 p-4">
        <div className="flex space-x-4">
          <button className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md">全て</button>
          <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">進行中</button>
          <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">完了</button>
          <button className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md">利益率順</button>
        </div>
      </div>

      {/* 工事別損益一覧 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注者</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">ステータス</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">予算</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">売上</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">原価</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">粗利益</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">粗利率</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {projectsWithPL.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{project.project_name}</div>
                    <div className="text-xs text-gray-500">{project.project_code}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">{project.client?.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      project.status === 'planning' ? 'bg-gray-100 text-gray-800' :
                      project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {project.status === 'planning' ? '計画中' :
                       project.status === 'in_progress' ? '進行中' :
                       project.status === 'completed' ? '完了' : project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    ¥{(project.budget_amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-blue-600">
                    ¥{project.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-orange-600">
                    ¥{project.cost.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${project.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ¥{project.profit.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${
                    project.profitRate >= 20 ? 'text-green-600' :
                    project.profitRate >= 10 ? 'text-orange-600' :
                    'text-red-600'
                  }`}>
                    {project.profitRate.toFixed(1)}%
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link
                      href={`/projects/${project.id}/ledger`}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* チャート表示エリア（将来拡張） */}
      <div className="bg-white rounded-lg shadow-sm mt-6 p-6">
        <h2 className="text-lg font-bold mb-4">月次推移グラフ</h2>
        <div className="h-64 flex items-center justify-center bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <p className="text-gray-400">グラフ表示（Phase 4で実装予定）</p>
        </div>
      </div>
    </div>
  )
}

export default async function ProfitLossPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ProfitLossContent />
      </Suspense>
    </div>
  )
}
