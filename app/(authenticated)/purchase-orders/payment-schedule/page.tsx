import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function PaymentScheduleContent() {
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

  // 未払いの発注書を支払期日順に取得
  const { data: paymentSchedule } = await supabase
    .from('purchase_orders')
    .select(`
      id,
      po_number,
      order_date,
      delivery_due_date,
      payment_due_date,
      total_amount,
      paid_amount,
      status,
      supplier:clients(name)
    `)
    .eq('organization_id', userData?.organization_id)
    .neq('status', 'cancelled')
    .order('payment_due_date', { ascending: true })

  // 支払予定を月別にグループ化
  const groupedByMonth = (paymentSchedule || []).reduce((acc: any, po: any) => {
    const dueDate = new Date(po.payment_due_date)
    const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(po)
    return acc
  }, {})

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const getStatusColor = (po: any) => {
    const remaining = po.total_amount - (po.paid_amount || 0)
    if (remaining <= 0) return 'text-green-600'

    const dueDate = new Date(po.payment_due_date)
    if (dueDate < today) return 'text-red-600'

    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue <= 7) return 'text-orange-600'

    return 'text-gray-800'
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">支払予定表</h1>
        <p className="text-gray-600">発注書の支払期日を月別に管理します</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">全体未払額</p>
          <p className="text-2xl font-bold text-gray-900">
            ¥{(paymentSchedule || [])
              .reduce((sum: number, po: any) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">期限超過</p>
          <p className="text-2xl font-bold text-red-600">
            ¥{(paymentSchedule || [])
              .filter((po: any) => new Date(po.payment_due_date) < today && (po.total_amount - (po.paid_amount || 0)) > 0)
              .reduce((sum: number, po: any) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">今月支払予定</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{(paymentSchedule || [])
              .filter((po: any) => {
                const dueDate = new Date(po.payment_due_date)
                return dueDate.getMonth() === today.getMonth() &&
                       dueDate.getFullYear() === today.getFullYear() &&
                       (po.total_amount - (po.paid_amount || 0)) > 0
              })
              .reduce((sum: number, po: any) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">来月以降</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{(paymentSchedule || [])
              .filter((po: any) => {
                const dueDate = new Date(po.payment_due_date)
                return dueDate > new Date(today.getFullYear(), today.getMonth() + 1, 0) &&
                       (po.total_amount - (po.paid_amount || 0)) > 0
              })
              .reduce((sum: number, po: any) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
              .toLocaleString()}
          </p>
        </div>
      </div>

      {/* 月別支払予定 */}
      <div className="space-y-6">
        {Object.keys(groupedByMonth).sort().map((monthKey) => {
          const [year, month] = monthKey.split('-')
          const items = groupedByMonth[monthKey]
          const monthTotal = items.reduce((sum: number, po: any) =>
            sum + (po.total_amount - (po.paid_amount || 0)), 0)

          return (
            <div key={monthKey} className="bg-white rounded-lg shadow-sm">
              <div className="border-b px-6 py-4 bg-gray-50">
                <h2 className="text-lg font-bold">
                  {year}年{month}月の支払予定
                  <span className="ml-4 text-blue-600">
                    合計: ¥{monthTotal.toLocaleString()}
                  </span>
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注番号</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">仕入先</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">発注日</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">支払期日</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">発注金額</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">支払済</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">未払額</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((po: any) => {
                      const remaining = po.total_amount - (po.paid_amount || 0)
                      return (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800">
                              {po.po_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{po.supplier?.name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(po.order_date).toLocaleDateString('ja-JP')}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColor(po)}`}>
                            {new Date(po.payment_due_date).toLocaleDateString('ja-JP')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            ¥{po.total_amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                            ¥{(po.paid_amount || 0).toLocaleString()}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${getStatusColor(po)}`}>
                            ¥{remaining.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {remaining > 0 && (
                              <Link
                                href={`/payments/new?po_id=${po.id}`}
                                className="text-indigo-600 hover:text-indigo-900 text-sm"
                              >
                                支払登録
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
            支払予定の発注書がありません
          </div>
        )}
      </div>
    </div>
  )
}

export default async function PaymentSchedulePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <PaymentScheduleContent />
      </Suspense>
    </div>
  )
}
