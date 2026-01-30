'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface PaymentScheduleItem {
  id: string
  po_number: string
  order_date: string
  payment_due_date: string
  total_amount: number
  paid_amount: number | null
  supplier?: { name: string } | { name: string }[] // Supabase can return array or object
}

interface PaymentScheduleClientProps {
  paymentSchedule: PaymentScheduleItem[]
}

export function PaymentScheduleClient({ paymentSchedule }: PaymentScheduleClientProps) {
  // Fix React #418: Calculate today's date only on client-side
  const [today, setToday] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    setToday(now)
    setIsClient(true)
  }, [])

  // Helper to format dates safely
  const formatDate = (dateString: string) => {
    if (!isClient) return dateString
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  // Helper to format numbers safely (prevent hydration mismatch)
  const formatNumber = (value: number) => {
    if (!isClient) return value.toString()
    return value.toLocaleString()
  }

  // Helper to get supplier name (handle both object and array)
  const getSupplierName = (supplier?: { name: string } | { name: string }[]) => {
    if (!supplier) return '-'
    if (Array.isArray(supplier)) {
      return supplier[0]?.name || '-'
    }
    return supplier.name || '-'
  }

  const getStatusColor = (po: PaymentScheduleItem) => {
    if (!today) return 'text-gray-800' // Default during SSR

    const remaining = po.total_amount - (po.paid_amount || 0)
    if (remaining <= 0) return 'text-green-600'

    const dueDate = new Date(po.payment_due_date)
    if (dueDate < today) return 'text-red-600'

    const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilDue <= 7) return 'text-orange-600'

    return 'text-gray-800'
  }

  // 支払予定を月別にグループ化
  const groupedByMonth = (paymentSchedule || []).reduce((acc: any, po: PaymentScheduleItem) => {
    const dueDate = new Date(po.payment_due_date)
    const monthKey = `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`

    if (!acc[monthKey]) {
      acc[monthKey] = []
    }
    acc[monthKey].push(po)
    return acc
  }, {})

  // Calculate summary stats (only after client-side hydration)
  const totalUnpaid = (paymentSchedule || []).reduce(
    (sum, po) => sum + (po.total_amount - (po.paid_amount || 0)),
    0
  )

  const overdueTotal = today
    ? (paymentSchedule || [])
        .filter((po) => new Date(po.payment_due_date) < today && (po.total_amount - (po.paid_amount || 0)) > 0)
        .reduce((sum, po) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
    : 0

  const thisMonthTotal = today
    ? (paymentSchedule || [])
        .filter((po) => {
          const dueDate = new Date(po.payment_due_date)
          return (
            dueDate.getMonth() === today.getMonth() &&
            dueDate.getFullYear() === today.getFullYear() &&
            (po.total_amount - (po.paid_amount || 0)) > 0
          )
        })
        .reduce((sum, po) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
    : 0

  const futureTotal = today
    ? (paymentSchedule || [])
        .filter((po) => {
          const dueDate = new Date(po.payment_due_date)
          return (
            dueDate > new Date(today.getFullYear(), today.getMonth() + 1, 0) &&
            (po.total_amount - (po.paid_amount || 0)) > 0
          )
        })
        .reduce((sum, po) => sum + (po.total_amount - (po.paid_amount || 0)), 0)
    : 0

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">支払予定表</h1>
        <p className="text-gray-600">発注書の支払期日を月別に管理します</p>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">全体未払額</p>
          <p className="text-2xl font-bold text-gray-900">
            ¥{formatNumber(totalUnpaid)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">期限超過</p>
          <p className="text-2xl font-bold text-red-600">
            ¥{formatNumber(overdueTotal)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">今月支払予定</p>
          <p className="text-2xl font-bold text-orange-600">
            ¥{formatNumber(thisMonthTotal)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-6">
          <p className="text-sm text-gray-600 mb-1">来月以降</p>
          <p className="text-2xl font-bold text-blue-600">
            ¥{formatNumber(futureTotal)}
          </p>
        </div>
      </div>

      {/* 月別支払予定 */}
      <div className="space-y-6">
        {Object.keys(groupedByMonth).sort().map((monthKey) => {
          const [year, month] = monthKey.split('-')
          const items = groupedByMonth[monthKey]
          const monthTotal = items.reduce(
            (sum: number, po: PaymentScheduleItem) => sum + (po.total_amount - (po.paid_amount || 0)),
            0
          )

          return (
            <div key={monthKey} className="bg-white rounded-lg shadow-sm">
              <div className="border-b px-6 py-4 bg-gray-50">
                <h2 className="text-lg font-bold">
                  {year}年{month}月の支払予定
                  <span className="ml-4 text-blue-600">合計: ¥{formatNumber(monthTotal)}</span>
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
                    {items.map((po: PaymentScheduleItem) => {
                      const remaining = po.total_amount - (po.paid_amount || 0)
                      return (
                        <tr key={po.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-800">
                              {po.po_number}
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">{getSupplierName(po.supplier)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {formatDate(po.order_date)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${getStatusColor(po)}`}>
                            {formatDate(po.payment_due_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            ¥{formatNumber(po.total_amount)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">
                            ¥{formatNumber(po.paid_amount || 0)}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-right font-medium ${getStatusColor(po)}`}>
                            ¥{formatNumber(remaining)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            {remaining > 0 && (
                              <Link href={`/payments/new?po_id=${po.id}`} className="text-indigo-600 hover:text-indigo-900 text-sm">
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
