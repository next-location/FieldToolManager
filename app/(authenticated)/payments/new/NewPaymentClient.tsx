'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const paymentType = searchParams.get('type') || 'receipt'
  const invoiceId = searchParams.get('invoice_id')
  const purchaseOrderId = searchParams.get('purchase_order_id')

  const [loading, setLoading] = useState(false)
  const [invoices, setInvoices] = useState<any[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<any>(null)

  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    payment_type: paymentType,
    invoice_id: invoiceId || '',
    purchase_order_id: purchaseOrderId || '',
    amount: 0,
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  })

  useEffect(() => {
    if (paymentType === 'receipt') {
      fetchInvoices()
    } else {
      fetchPurchaseOrders()
    }
  }, [paymentType])

  useEffect(() => {
    if (invoiceId) {
      fetchInvoiceDetails(invoiceId)
    }
    if (purchaseOrderId) {
      fetchPurchaseOrderDetails(purchaseOrderId)
    }
  }, [invoiceId, purchaseOrderId])

  const fetchInvoices = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user?.id)
      .single()

    const { data } = await supabase
      .from('billing_invoices')
      .select(`
        id,
        invoice_number,
        client:clients(name),
        total_amount,
        paid_amount,
        status
      `)
      .eq('organization_id', userData?.organization_id)
      .not('status', 'eq', 'paid')
      .order('invoice_date', { ascending: false })

    if (data) {
      setInvoices(data.filter(inv => inv.paid_amount < inv.total_amount))
    }
  }

  const fetchPurchaseOrders = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user?.id)
      .single()

    const { data } = await supabase
      .from('purchase_orders')
      .select(`
        id,
        order_number,
        supplier:clients(name),
        total_amount,
        paid_amount,
        status
      `)
      .eq('organization_id', userData?.organization_id)
      .not('status', 'eq', 'paid')
      .order('order_date', { ascending: false })

    if (data) {
      setPurchaseOrders(data.filter(po => po.paid_amount < po.total_amount))
    }
  }

  const fetchInvoiceDetails = async (id: string) => {
    const { data } = await supabase
      .from('billing_invoices')
      .select(`
        *,
        client:clients(name)
      `)
      .eq('id', id)
      .single()

    if (data) {
      setSelectedInvoice(data)
      const remainingAmount = data.total_amount - (data.paid_amount || 0)
      setFormData(prev => ({
        ...prev,
        invoice_id: id,
        amount: remainingAmount
      }))
    }
  }

  const fetchPurchaseOrderDetails = async (id: string) => {
    const { data } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:clients(name)
      `)
      .eq('id', id)
      .single()

    if (data) {
      setSelectedPurchaseOrder(data)
      const remainingAmount = data.total_amount - (data.paid_amount || 0)
      setFormData(prev => ({
        ...prev,
        purchase_order_id: id,
        amount: remainingAmount
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user?.id)
        .single()

      // 支払記録を作成（空文字列のUUIDをnullに変換）
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          ...formData,
          invoice_id: formData.invoice_id || null,
          purchase_order_id: formData.purchase_order_id || null,
          organization_id: userData?.organization_id,
          recorded_by: user?.id
        })
        .select()
        .single()

      if (paymentError) throw paymentError

      // 請求書または発注書の支払済み金額を更新
      if (paymentType === 'receipt' && formData.invoice_id) {
        const newPaidAmount = (selectedInvoice?.paid_amount || 0) + formData.amount
        const isPaid = newPaidAmount >= selectedInvoice?.total_amount

        await supabase
          .from('billing_invoices')
          .update({
            paid_amount: newPaidAmount,
            status: isPaid ? 'paid' : selectedInvoice?.status
          })
          .eq('id', formData.invoice_id)
      } else if (paymentType === 'payment' && formData.purchase_order_id) {
        const newPaidAmount = (selectedPurchaseOrder?.paid_amount || 0) + formData.amount
        const isPaid = newPaidAmount >= selectedPurchaseOrder?.total_amount

        await supabase
          .from('purchase_orders')
          .update({
            paid_amount: newPaidAmount,
            status: isPaid ? 'paid' : selectedPurchaseOrder?.status
          })
          .eq('id', formData.purchase_order_id)
      }

      router.push('/payments')
    } catch (error) {
      console.error('Error creating payment:', error)
      alert('入出金登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const isReceipt = paymentType === 'receipt'

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">
          {isReceipt ? '入金登録' : '支払登録'}
        </h1>
        <p className="text-gray-600">
          {isReceipt ? '請求書に対する入金を登録します' : '発注書に対する支払を登録します'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isReceipt ? '入金日' : '支払日'} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({...formData, payment_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isReceipt ? '請求書' : '発注書'} <span className="text-red-500">*</span>
              </label>
              {isReceipt ? (
                <select
                  value={formData.invoice_id}
                  onChange={(e) => {
                    setFormData({...formData, invoice_id: e.target.value})
                    if (e.target.value) fetchInvoiceDetails(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">選択してください</option>
                  {invoices.map(invoice => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.client?.name}
                      （残額: ¥{(invoice.total_amount - invoice.paid_amount).toLocaleString()}）
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  value={formData.purchase_order_id}
                  onChange={(e) => {
                    setFormData({...formData, purchase_order_id: e.target.value})
                    if (e.target.value) fetchPurchaseOrderDetails(e.target.value)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">選択してください</option>
                  {purchaseOrders.map(order => (
                    <option key={order.id} value={order.id}>
                      {order.order_number} - {order.supplier?.name}
                      （残額: ¥{(order.total_amount - order.paid_amount).toLocaleString()}）
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 選択された請求書/発注書の詳細表示 */}
            {(selectedInvoice || selectedPurchaseOrder) && (
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="font-medium mb-2">
                  {isReceipt ? '請求書情報' : '発注書情報'}
                </h3>
                <div className="text-sm space-y-1">
                  <p>
                    番号: {isReceipt ? selectedInvoice?.invoice_number : selectedPurchaseOrder?.order_number}
                  </p>
                  <p>
                    取引先: {isReceipt ? selectedInvoice?.client?.name : selectedPurchaseOrder?.supplier?.name}
                  </p>
                  <p>
                    請求額: ¥{(isReceipt ? selectedInvoice?.total_amount : selectedPurchaseOrder?.total_amount)?.toLocaleString()}
                  </p>
                  <p>
                    既入金額: ¥{(isReceipt ? selectedInvoice?.paid_amount : selectedPurchaseOrder?.paid_amount || 0)?.toLocaleString()}
                  </p>
                  <p className="font-medium text-blue-600">
                    未入金額: ¥{(
                      (isReceipt ? selectedInvoice?.total_amount : selectedPurchaseOrder?.total_amount) -
                      (isReceipt ? selectedInvoice?.paid_amount : selectedPurchaseOrder?.paid_amount || 0)
                    )?.toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isReceipt ? '入金額' : '支払額'} <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
                min="0"
                step="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isReceipt ? '入金方法' : '支払方法'} <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="bank_transfer">銀行振込</option>
                <option value="cash">現金</option>
                <option value="check">小切手</option>
                <option value="credit_card">クレジットカード</option>
                <option value="other">その他</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参照番号
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) => setFormData({...formData, reference_number: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="振込番号、小切手番号など"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="メモや注記事項"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/payments')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className={`${
              isReceipt
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            } text-white px-6 py-2 rounded-md`}
            disabled={loading}
          >
            {loading ? '登録中...' : `${isReceipt ? '入金' : '支払'}を登録`}
          </button>
        </div>
      </form>
      </div>
    </div>
  )
}