'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface OrderItem {
  id: string
  item_type: 'material' | 'labor' | 'subcontract' | 'equipment' | 'other'
  item_name: string
  description: string
  quantity: number
  unit: string
  unit_price: number
  tax_rate: number
  amount: number
}

export default function NewPurchaseOrderPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: '1',
      item_type: 'material',
      item_name: '',
      description: '',
      quantity: 1,
      unit: '個',
      unit_price: 0,
      tax_rate: 10,
      amount: 0
    }
  ])

  const [formData, setFormData] = useState({
    order_number: '',
    supplier_id: '',
    project_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_location: '',
    payment_terms: '',
    notes: '',
    internal_notes: ''
  })

  useEffect(() => {
    fetchSuppliers()
    fetchProjects()
    generateOrderNumber()
  }, [])

  const fetchSuppliers = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, client_code, payment_terms')
      .in('client_type', ['supplier', 'both'])
      .eq('is_active', true)
      .order('name')

    if (data) setSuppliers(data)
  }

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('projects')
      .select('id, project_name, project_code, site_address')
      .in('status', ['planning', 'in_progress'])
      .order('project_name')

    if (data) setProjects(data)
  }

  const generateOrderNumber = async () => {
    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .like('order_number', `PO-${year}${month}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const lastNumber = parseInt(data[0].order_number.split('-')[2])
      setFormData(prev => ({
        ...prev,
        order_number: `PO-${year}${month}-${String(lastNumber + 1).padStart(4, '0')}`
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        order_number: `PO-${year}${month}-0001`
      }))
    }
  }

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, project_id: projectId })

    // プロジェクトの現場住所を配送先に自動設定
    const project = projects.find(p => p.id === projectId)
    if (project?.site_address) {
      setFormData(prev => ({
        ...prev,
        delivery_location: project.site_address
      }))
    }
  }

  const handleSupplierChange = (supplierId: string) => {
    setFormData({ ...formData, supplier_id: supplierId })

    // 仕入先の支払条件を自動設定
    const supplier = suppliers.find(s => s.id === supplierId)
    if (supplier?.payment_terms) {
      setFormData(prev => ({
        ...prev,
        payment_terms: supplier.payment_terms
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
      item_type: 'material',
      item_name: '',
      description: '',
      quantity: 1,
      unit: '個',
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

      // 発注書を作成
      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          ...formData,
          organization_id: userData?.organization_id,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          status,
          created_by: user?.id
        })
        .select()
        .single()

      if (orderError) throw orderError

      // 明細を作成
      const itemsToInsert = items.map((item, index) => ({
        order_id: order.id,
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
        .from('purchase_order_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      router.push('/purchase-orders')
    } catch (error) {
      console.error('Error creating purchase order:', error)
      alert('発注書の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">発注書作成</h1>
        <p className="text-gray-600">材料・外注の発注書を作成します</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'draft')} className="max-w-6xl">
        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">基本情報</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                発注番号
              </label>
              <input
                type="text"
                value={formData.order_number}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                仕入先 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => handleSupplierChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              >
                <option value="">選択してください</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.client_code})
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
                onChange={(e) => handleProjectChange(e.target.value)}
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
                発注日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.order_date}
                onChange={(e) => setFormData({...formData, order_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                希望納期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.delivery_date}
                onChange={(e) => setFormData({...formData, delivery_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払条件
              </label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="月末締め翌月払い 等"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                納品場所
              </label>
              <input
                type="text"
                value={formData.delivery_location}
                onChange={(e) => setFormData({...formData, delivery_location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="現場住所または倉庫住所"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">発注明細</h2>
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
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">品名</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">仕様・規格</th>
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
                        <option value="equipment">機材</option>
                        <option value="subcontract">外注</option>
                        <option value="labor">労務</option>
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
                        placeholder="品名"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="規格・仕様"
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
                発注備考（仕入先向け）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="納品時の注意事項など"
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
                placeholder="社内用のメモ（発注書には記載されません）"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push('/purchase-orders')}
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
              発注確定
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}