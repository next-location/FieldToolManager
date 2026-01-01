import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'

async function ReceiptScheduleContent() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userRole || '')) {
    redirect('/')
  }

  // 未回収の請求書を支払期日順に取得
  const { data: receiptSchedule } = await supabase
    .from('billing_invoices')
    .select(`
      id,
      invoice_number,
      invoice_date,
      due_date,
      total_amount,
      paid_amount,
      status,
      client:clients(name)
    `)
    .eq('organization_id', organizationId)
    .neq('status', 'cancelled')
    .order('due_date', { ascending: true })

  // 入金予定を月別にグループ化
  const groupedByMonth = (receiptSchedule || []).reduce((acc: any, invoice: any) => {
    const dueDate = new Date(invoice.due_date)
    const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(invoice)
    return acc
  }, {})

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getStatusColor = (invoice: any) => {
    const remaining = invoice.total_amount - (invoice.paid_amount || 0)
    if (remaining <= 0) return 'text-green-600'

    const dueDate = new Date(invoice.due_date)
    if (dueDate < today) return 'text-red-600'

    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue <= 7) return 'text-orange-600'

    return 'text-gray-800'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">入金予定表</h1>
        <p className="text-gray-600">請求書の入金期日を月別に管理します</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">全体未回収額</p>
          <p className="text-2xl font-bold text-gray-900">
            ¥{(receiptSchedule || [])
              .reduce((sum: number, inv: any) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">期限超過</p>
          <p className="text-2xl font-bold text-red-600">
            ¥{(receiptSchedule || [])
              .filter((inv: any) => new Date(inv.due_date) < today && (inv.total_amount - (inv.paid_amount || 0)) > 0)
              .reduce((sum: number, inv: any) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">今月入金予定</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{(receiptSchedule || [])
              .filter((inv: any) => {
                const dueDate = new Date(inv.due_date)
                return dueDate.getMonth() === today.getMonth() &&
                       dueDate.getFullYear() === today.getFullYear() &&
                       (inv.total_amount - (inv.paid_amount || 0)) > 0
              })
              .reduce((sum: number, inv: any) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">来月以降</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{(receiptSchedule || [])
              .filter((inv: any) => {
                const dueDate = new Date(inv.due_date)
                return dueDate > new Date(today.getFullYear(), today.getMonth() + 1, 0) &&
                       (inv.total_amount - (inv.paid_amount || 0)) > 0
              })
              .reduce((sum: number, inv: any) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* 月別入金予定 */}
      <div className="space-y-6">
        {Object.keys(groupedByMonth).sort().map((monthKey) => {
          const [year, month] = monthKey.split('-')
          const items = groupedByMonth[monthKey]
          const monthTotal = items.reduce((sum: number, inv: any) =>
            sum + (inv.total_amount - (inv.paid_amount || 0)), 0)

          return (
            <div key={monthKey} className="bg-white rounded-lg shadow-sm">
              <div className="border-b px-6 py-4 bg-gray-50">
                <h2 className="text-lg font-bold">
                  {year}年{month}月の入金予定
                  <span className="ml-4 text-blue-600">
                    合計: ¥{monthTotal.toLocaleString()}
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求番号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">取引先</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">請求日</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">入金期日</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">請求金額</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">入金済</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未回収額</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((invoice: any) => {
                      const remaining = invoice.total_amount - (invoice.paid_amount || 0)
                      return (
                        <tr key={invoice.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-800">
                              {invoice.invoice_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{invoice.client?.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColor(invoice)}`}>
                            {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            ¥{invoice.total_amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                            ¥{(invoice.paid_amount || 0).toLocaleString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${getStatusColor(invoice)}`}>
                            ¥{remaining.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {remaining > 0 && (
                              <Link
                                href={`/payments/new?invoice_id=${invoice.id}`}
                                className="text-indigo-600 hover:text-indigo-900 text-sm"
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
              </div>
            </div>
          )
        })}

        {Object.keys(groupedByMonth).length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-500">
            入金予定の請求書がありません
          </div>
        )}
      </div>
    </div>
  )
}

export default async function ReceiptSchedulePage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ReceiptScheduleContent />
      </Suspense>
      </div>
    </div>
  )
}
