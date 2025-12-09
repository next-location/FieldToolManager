import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function ReceivablesList() {
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

  // 未払いの請求書を取得
  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      client:clients(name, phone, email),
      project:projects(project_name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('due_date', { ascending: true })

  // 売掛金がある請求書のみフィルタリング
  const receivables = invoices?.filter(inv => inv.total_amount > inv.paid_amount) || []

  // 取引先ごとの売掛金集計
  const clientSummary = receivables.reduce((acc: any, inv) => {
    const clientId = inv.client_id
    if (!acc[clientId]) {
      acc[clientId] = {
        client: inv.client,
        totalAmount: 0,
        paidAmount: 0,
        receivableAmount: 0,
        invoiceCount: 0,
        oldestDueDate: inv.due_date
      }
    }
    acc[clientId].totalAmount += inv.total_amount
    acc[clientId].paidAmount += inv.paid_amount
    acc[clientId].receivableAmount += (inv.total_amount - inv.paid_amount)
    acc[clientId].invoiceCount += 1
    if (new Date(inv.due_date) < new Date(acc[clientId].oldestDueDate)) {
      acc[clientId].oldestDueDate = inv.due_date
    }
    return acc
  }, {})

  const totalReceivable = receivables.reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0)
  const overdueReceivable = receivables
    .filter(inv => new Date(inv.due_date) < new Date())
    .reduce((sum, inv) => sum + (inv.total_amount - inv.paid_amount), 0)

  return (
    <div>
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">売掛金合計</p>
          <p className="text-2xl font-bold text-blue-600">¥{totalReceivable.toLocaleString()}</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">期限超過分</p>
          <p className="text-2xl font-bold text-red-600">¥{overdueReceivable.toLocaleString()}</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">未入金件数</p>
          <p className="text-2xl font-bold">{receivables.length}件</p>
        </div>
        <div className="bg-white shadow-sm rounded-lg p-4">
          <p className="text-sm text-gray-500 mb-1">取引先数</p>
          <p className="text-2xl font-bold">{Object.keys(clientSummary).length}社</p>
        </div>
      </div>

      {/* 取引先別売掛金 */}
      <div className="bg-white shadow-sm rounded-lg mb-6">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold">取引先別売掛金</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">売掛金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">未入金件数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">最古期日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">延滞日数</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(clientSummary).map(([clientId, summary]: [string, any]) => {
                const daysPastDue = Math.floor((Date.now() - new Date(summary.oldestDueDate).getTime()) / (1000 * 60 * 60 * 24))
                const isOverdue = daysPastDue > 0

                return (
                  <tr key={clientId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{summary.client?.name}</p>
                        {summary.client?.phone && (
                          <p className="text-xs text-gray-500">{summary.client.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-sm font-bold text-orange-600">
                        ¥{summary.receivableAmount.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {summary.invoiceCount}件
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(summary.oldestDueDate).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOverdue ? (
                        <span className="text-red-600 font-medium">{daysPastDue}日超過</span>
                      ) : (
                        <span className="text-gray-500">期限内</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/clients/${clientId}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        詳細
                      </Link>
                      <button className="text-purple-600 hover:text-purple-900">
                        督促
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 請求書明細 */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold">未入金請求書一覧</h2>
          <Link
            href="/invoices"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            すべての請求書を見る →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">工事名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払期日</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">未入金額</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状態</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {receivables.map((invoice) => {
                const receivableAmount = invoice.total_amount - invoice.paid_amount
                const isOverdue = new Date(invoice.due_date) < new Date()
                const daysPastDue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))

                return (
                  <tr key={invoice.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {invoice.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invoice.client?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invoice.project?.project_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      ¥{invoice.total_amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-orange-600">
                      ¥{receivableAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isOverdue ? (
                        <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          {daysPastDue}日超過
                        </span>
                      ) : (
                        <span className="inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          期限内
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        詳細
                      </Link>
                      <Link
                        href={`/payments/new?type=receipt&invoice_id=${invoice.id}`}
                        className="text-green-600 hover:text-green-900"
                      >
                        入金登録
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {receivables.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              売掛金はありません
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default async function ReceivablesPage() {
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
  if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">売掛金管理</h1>
        <p className="text-gray-600">
          未入金の請求書と売掛金の管理を行います
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ReceivablesList />
      </Suspense>
    </div>
  )
}