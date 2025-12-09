'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface InvoiceItem {
  id?: string
  item_type: 'material' | 'labor' | 'subcontract' | 'expense' | 'other'
  item_name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  tax_rate: number
  amount: number
  display_order: number
}

export default function EditInvoicePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([])
  const [invoiceId, setInvoiceId] = useState<string>('')
  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    project_id: '',
    invoice_date: '',
    due_date: '',
    title: '',
    is_qualified_invoice: false,
    invoice_registration_number: '',
    notes: '',
    internal_notes: '',
    status: 'draft'
  })

  useEffect(() => {
    params.then(p => setInvoiceId(p.id))
  }, [params])

  useEffect(() => {
    if (!invoiceId) return
    fetchClients()
    fetchProjects()
    fetchInvoice()
  }, [invoiceId])

  const fetchInvoice = async () => {
    const { data: invoice } = await supabase
      .from('billing_invoices')
      .select(`
        *,
        billing_invoice_items(*)
      `)
      .eq('id', invoiceId)
      .single()

    if (invoice) {
      setFormData({
        invoice_number: invoice.invoice_number,
        client_id: invoice.client_id || '',
        project_id: invoice.project_id || '',
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        title: invoice.title,
        is_qualified_invoice: invoice.is_qualified_invoice || false,
        invoice_registration_number: invoice.invoice_registration_number || '',
        notes: invoice.notes || '',
        internal_notes: invoice.internal_notes || '',
        status: invoice.status
      })

      if (invoice.billing_invoice_items) {
        setItems(invoice.billing_invoice_items.sort((a: any, b: any) => a.display_order - b.display_order))
      }
    }
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, client_code, payment_terms, payment_due_days')
      .eq('is_active', true)
      .order('name')

    if (data) setClients(data)
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name, project_code')
      .in('status', ['planning', 'in_progress'])
      .order('project_name')

    if (data) setProjects(data)
  }

  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, client_id: clientId })

    // 支払条件から期日を計算
    const client = clients.find(c => c.id === clientId)
    if (client?.payment_due_days) {
      const dueDate = new Date(formData.invoice_date)
      dueDate.setDate(dueDate.getDate() + client.payment_due_days)
      setFormData(prev => ({
        ...prev,
        due_date: dueDate.toISOString().split('T')[0]
      }))
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }

    // 金額を再計算
    if (field === 'quantity' || field === 'unit_price') {
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price
    }

    setItems(newItems)
  }

  const addItem = () => {
    const newOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order)) + 1 : 1
    setItems([...items, {
      item_type: 'labor',
      item_name: '',
      description: '',
      quantity: 1,
      unit: '式',
      unit_price: 0,
      tax_rate: 10,
      amount: 0,
      display_order: newOrder
    }])
  }

  const removeItem = async (index: number) => {
    if (items.length > 1) {
      const itemToRemove = items[index]

      // 既存のアイテムの場合はDBから削除
      if (itemToRemove.id) {
        await supabase
          .from('billing_invoice_items')
          .delete()
          .eq('id', itemToRemove.id)
      }

      setItems(items.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0)
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { subtotal, taxAmount, total } = calculateTotals()

      // 請求書を更新
      const { error: invoiceError } = await supabase
        .from('billing_invoices')
        .update({
          ...formData,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          updated_at: new Date().toISOString()
        })
        .eq('id', invoiceId)

      if (invoiceError) throw invoiceError

      // 明細を更新（一旦全削除して再作成）
      await supabase
        .from('billing_invoice_items')
        .delete()
        .eq('invoice_id', invoiceId)

      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoiceId,
        display_order: index + 1,
        item_type: item.item_type,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_rate: item.tax_rate
      }))

      const { error: itemsError } = await supabase
        .from('billing_invoice_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      router.push(`/invoices/${invoiceId}`)
    } catch (error) {
      console.error('Error updating invoice:', error)
      alert('請求書の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">請求書編集</h1>
        <p className="text-gray-600">{formData.invoice_number}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                請求番号
              </label>
              <input
                type="text"
                value={formData.invoice_number}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                取引先 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.client_id}
                onChange={(e) => handleClientChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">選択してください</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name} ({client.client_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事
              </label>
              <select
                value={formData.project_id}
                onChange={(e) => setFormData({...formData, project_id: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">選択してください</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.project_name} ({project.project_code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                請求日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払期日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="draft">下書き</option>
                <option value="approved">承認済</option>
                <option value="sent">送付済</option>
                <option value="paid">入金済</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                件名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_qualified_invoice}
                  onChange={(e) => setFormData({...formData, is_qualified_invoice: e.target.checked})}
                  className="mr-2"
                />
                <span className="text-sm font-medium">適格請求書発行事業者として発行</span>
              </label>
              {formData.is_qualified_invoice && (
                <input
                  type="text"
                  value={formData.invoice_registration_number}
                  onChange={(e) => setFormData({...formData, invoice_registration_number: e.target.value})}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="登録番号（例: T1234567890123）"
                />
              )}
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">明細</h2>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              行追加
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">種別</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">項目名</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">説明</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">数量</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">単位</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">単価</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">金額</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">税率</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase"></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-3 py-2">
                      <select
                        value={item.item_type}
                        onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="material">材料</option>
                        <option value="labor">労務</option>
                        <option value="subcontract">外注</option>
                        <option value="expense">経費</option>
                        <option value="other">その他</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        step="0.01"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        required
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      ¥{item.amount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.tax_rate}
                        onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="10">10%</option>
                        <option value="8">8%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-900 text-sm"
                        disabled={items.length === 1}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">小計:</span>
                <span className="font-medium">¥{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">消費税:</span>
                <span className="font-medium">¥{Math.floor(taxAmount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>合計:</span>
                <span>¥{Math.floor(total).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">備考</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                備考（請求書に記載）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                社内メモ
              </label>
              <textarea
                value={formData.internal_notes}
                onChange={(e) => setFormData({...formData, internal_notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push(`/invoices/${invoiceId}`)}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? '更新中...' : '更新'}
          </button>
        </div>
      </form>
    </div>
  )
}