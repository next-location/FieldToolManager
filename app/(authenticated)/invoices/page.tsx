import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function InvoiceList() {
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

  const { data: invoices } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">請求書一覧</h2>
        <Link
          href="/invoices/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
        >
          新規請求書作成
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                請求番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                取引先
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工事名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                請求日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                支払期日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額（税込）
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                入金状況
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {invoices?.map((invoice) => {
              const isPaid = invoice.paid_amount >= invoice.total_amount
              const isPartiallyPaid = invoice.paid_amount > 0 && !isPaid
              const isOverdue = !isPaid && new Date(invoice.due_date) < new Date()

              return (
                <tr key={invoice.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.project?.project_name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    ¥{invoice.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {isPaid ? (
                      <span className="text-green-600 font-medium">入金済</span>
                    ) : isPartiallyPaid ? (
                      <span className="text-yellow-600 font-medium">
                        一部入金 ¥{invoice.paid_amount.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-500">未入金</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                      invoice.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : invoice.status === 'approved'
                        ? 'bg-blue-100 text-blue-800'
                        : invoice.status === 'sent'
                        ? 'bg-purple-100 text-purple-800'
                        : invoice.status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : isOverdue
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {invoice.status === 'draft' ? '下書き'
                        : invoice.status === 'approved' ? '承認済'
                        : invoice.status === 'sent' ? '送付済'
                        : invoice.status === 'paid' ? '入金済'
                        : isOverdue ? '期限超過'
                        : invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/invoices/${invoice.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      詳細
                    </Link>
                    {invoice.status === 'draft' && (
                      <Link
                        href={`/invoices/${invoice.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        編集
                      </Link>
                    )}
                    <button className="text-green-600 hover:text-green-900 mr-3">
                      PDF
                    </button>
                    {!isPaid && (
                      <Link
                        href={`/payments/new?invoice_id=${invoice.id}`}
                        className="text-purple-600 hover:text-purple-900"
                      >
                        入金登録
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {(!invoices || invoices.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            請求書データがありません
          </div>
        )}
      </div>
    </div>
  )
}

export default async function InvoicesPage() {
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

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">請求書管理</h1>
        <p className="text-gray-600">
          請求書の作成・管理を行います
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <InvoiceList />
      </Suspense>
    </div>
  )
}