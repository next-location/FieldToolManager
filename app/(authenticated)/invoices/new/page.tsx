'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface InvoiceItem {
  id: string
  item_type: 'material' | 'labor' | 'subcontract' | 'expense' | 'other'
  item_name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  tax_rate: number
  amount: number
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClientComponentClient()

  const estimateId = searchParams.get('estimate_id')
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      item_type: 'labor',
      item_name: '',
      description: '',
      quantity: 1,
      unit: '式',
      unit_price: 0,
      tax_rate: 10,
      amount: 0
    }
  ])

  const [formData, setFormData] = useState({
    invoice_number: '',
    client_id: '',
    project_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title: '',
    is_qualified_invoice: true,
    invoice_registration_number: '',
    notes: '',
    internal_notes: ''
  })

  useEffect(() => {
    fetchClients()
    fetchProjects()
    generateInvoiceNumber()
    fetchOrganizationInfo()

    // 見積書から変換の場合
    if (estimateId) {
      loadEstimateData(estimateId)
    }
  }, [estimateId])

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

  const fetchOrganizationInfo = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user?.id)
      .single()

    if (userData) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('tax_registration_number, is_qualified_invoice_issuer')
        .eq('id', userData.organization_id)
        .single()

      if (orgData) {
        setFormData(prev => ({
          ...prev,
          is_qualified_invoice: orgData.is_qualified_invoice_issuer || false,
          invoice_registration_number: orgData.tax_registration_number || ''
        }))
      }
    }
  }

  const generateInvoiceNumber = async () => {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const { data, error } = await supabase
      .from('billing_invoices')
      .select('invoice_number')
      .like('invoice_number', `INV-${year}${month}-%`)
      .order('invoice_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].invoice_number.split('-')[2])
      setFormData(prev => ({
        ...prev,
        invoice_number: `INV-${year}${month}-${String(lastNumber + 1).padStart(4, '0')}`
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        invoice_number: `INV-${year}${month}-0001`
      }))
    }
  }

  const loadEstimateData = async (estimateId: string) => {
    const { data: estimate } = await supabase
      .from('estimates')
      .select(`
        *,
        estimate_items(*),
        client:clients(payment_due_days)
      `)
      .eq('id', estimateId)
      .single()

    if (estimate) {
      setFormData(prev => ({
        ...prev,
        client_id: estimate.client_id,
        project_id: estimate.project_id,
        title: estimate.title.replace('見積書', '請求書'),
        notes: estimate.notes || ''
      }))

      // 支払期日を計算
      if (estimate.client?.payment_due_days) {
        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + estimate.client.payment_due_days)
        setFormData(prev => ({
          ...prev,
          due_date: dueDate.toISOString().split('T')[0]
        }))
      }

      // 明細をコピー
      if (estimate.estimate_items) {
        setItems(estimate.estimate_items.map((item: any, index: number) => ({
          id: String(index + 1),
          item_type: item.item_type,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
          amount: item.amount
        })))
      }
    }
  }

  const handleClientChange = async (clientId: string) => {
    setFormData({ ...formData, client_id: clientId })

    // 支払条件から期日を計算
    const client = clients.find(c => c.id === clientId)
    if (client?.payment_due_days) {
      const dueDate = new Date()
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
    setItems([...items, {
      id: String(items.length + 1),
      item_type: 'labor',
      item_name: '',
      description: '',
      quantity: 1,
      unit: '式',
      unit_price: 0,
      tax_rate: 10,
      amount: 0
    }])
  }

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = items.reduce((sum, item) => sum + (item.amount * item.tax_rate / 100), 0)
    const total = subtotal + taxAmount

    return { subtotal, taxAmount, total }
  }

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'approved' = 'draft') => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user?.id)
        .single()

      const { subtotal, taxAmount, total } = calculateTotals()

      // 請求書を作成
      const { data: invoice, error: invoiceError } = await supabase
        .from('billing_invoices')
        .insert({
          ...formData,
          organization_id: userData?.organization_id,
          estimate_id: estimateId || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          status,
          created_by: user?.id
        })
        .select()
        .single()

      if (invoiceError) throw invoiceError

      // 明細を作成
      const itemsToInsert = items.map((item, index) => ({
        invoice_id: invoice.id,
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

      router.push('/invoices')
    } catch (error) {
      console.error('Error creating invoice:', error)
      alert('請求書の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">請求書作成</h1>
        {estimateId && (
          <p className="text-gray-600">見積書から作成</p>
        )}
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'draft')} className="max-w-6xl">
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
                placeholder="〇〇工事 請求書"
              />
            </div>

            {formData.is_qualified_invoice && (
              <div className="md:col-span-2">
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">適格請求書発行事業者</span>
                    {formData.invoice_registration_number && (
                      <span className="ml-2">登録番号: {formData.invoice_registration_number}</span>
                    )}
                  </p>
                </div>
              </div>
            )}
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
                  <tr key={item.id}>
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
                placeholder="お振込手数料はお客様ご負担でお願いいたします。"
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
                placeholder="社内用のメモ（請求書には記載されません）"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/invoices')}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
          >
            キャンセル
          </button>
          <div className="space-x-3">
            <button
              type="submit"
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              disabled={loading}
            >
              下書き保存
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, 'approved')}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
              disabled={loading}
            >
              作成して承認
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}