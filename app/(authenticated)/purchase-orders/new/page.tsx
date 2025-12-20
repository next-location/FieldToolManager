'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

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
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [loading, setLoading] = useState(false)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [items, setItems] = useState<OrderItem[]>([
    {
      id: '1',
      item_type: 'material',
      item_name: '',
      description: '',
      quantity: '' as any,
      unit: '袋',
      unit_price: '' as any,
      tax_rate: 10,
      amount: 0
    }
  ])

  const [formData, setFormData] = useState({
    order_number: '',
    client_id: '', // 変更: supplier_id → client_id
    project_id: '',
    order_date: new Date().toISOString().split('T')[0],
    delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    delivery_location: '',
    payment_terms: '',
    notes: '',
    internal_memo: '' // 変更: internal_notes → internal_memo
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
      .select('id, project_name, project_code')
      .order('project_name')

    if (data) setProjects(data)
  }

  const generateOrderNumber = async () => {
    // ユーザー情報取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) return

    const year = new Date().getFullYear()
    const month = String(new Date().getMonth() + 1).padStart(2, '0')

    // 組織IDでフィルタリングして最新の発注番号を取得
    const { data, error } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .eq('organization_id', userData.organization_id)
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
  }

  const handleSupplierChange = (clientId: string) => {
    setFormData({ ...formData, client_id: clientId }) // 変更: supplier_id → client_id

    // 仕入先の支払条件を自動設定
    const supplier = suppliers.find(s => s.id === clientId)
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
      const quantity = typeof newItems[index].quantity === 'string' ? parseFloat(newItems[index].quantity) || 0 : newItems[index].quantity
      const unitPrice = typeof newItems[index].unit_price === 'string' ? parseFloat(newItems[index].unit_price) || 0 : newItems[index].unit_price
      newItems[index].amount = quantity * unitPrice
    }

    setItems(newItems)
  }

  const handleNumericInput = (index: number, field: string, value: string) => {
    // 空文字列または数値のみ許可
    if (value === '' || !isNaN(Number(value))) {
      handleItemChange(index, field, value === '' ? '' : parseFloat(value))
    }
  }

  const addItem = () => {
    setItems([...items, {
      id: String(items.length + 1),
      item_type: 'material',
      item_name: '',
      description: '',
      quantity: '' as any,
      unit: '袋',
      unit_price: '' as any,
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

  const handleSubmit = async (e: React.FormEvent, action: 'draft' | 'submit' = 'draft') => {
    e.preventDefault()
    setLoading(true)

    try {
      // APIを使って発注書を作成（履歴記録を含む）
      const itemsData = items.map((item) => ({
        item_type: item.item_type,
        item_name: item.item_name,
        description: item.description || null,
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
        unit: item.unit,
        unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price,
        tax_rate: item.tax_rate
      }))

      const response = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: formData.client_id,
          project_id: formData.project_id || null,
          order_date: formData.order_date,
          delivery_date: formData.delivery_date || null,
          delivery_location: formData.delivery_location || null,
          payment_terms: formData.payment_terms || null,
          notes: formData.notes || null,
          internal_memo: formData.internal_memo || null,
          items: itemsData
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '発注書の作成に失敗しました')
      }

      const { data: order } = await response.json()

      // 確定提出の場合は追加のAPI呼び出し
      if (action === 'submit' && order.id) {
        const submitResponse = await fetch(`/api/purchase-orders/${order.id}/submit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!submitResponse.ok) {
          console.error('Failed to submit purchase order')
        }
      }

      router.push('/purchase-orders')
    } catch (error) {
      console.error('Error creating purchase order:', error)
      alert(error instanceof Error ? error.message : '発注書の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">発注書作成</h1>
        <p className="text-gray-600">材料・外注の発注書を作成します</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, 'draft')}>
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
                value={formData.client_id}
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
          <h2 className="text-lg font-semibold mb-4">発注明細</h2>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-gray-700">明細 #{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    削除
                  </button>
                </div>

                <div className="space-y-3">
                  {/* 種別・品名・仕様を1行 */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: '140px 1fr 1fr' }}>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">種別</label>
                      <select
                        value={item.item_type}
                        onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      >
                        <option value="material">材料</option>
                        <option value="equipment">機材</option>
                        <option value="subcontract">外注</option>
                        <option value="labor">労務</option>
                        <option value="other">その他</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        品名 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.item_name}
                        onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="品名を入力"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">仕様・規格</label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="仕様や規格を入力"
                      />
                    </div>
                  </div>

                  {/* 数量・単位・単価・税率・金額を1行 */}
                  <div className="grid gap-2" style={{ gridTemplateColumns: '100px 120px 1fr 90px 1fr' }}>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        数量 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => handleNumericInput(index, 'quantity', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="0"
                        inputMode="decimal"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        単位 <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={item.unit}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        required
                      >
                        <option value="個">個</option>
                        <option value="袋">袋</option>
                        <option value="箱">箱</option>
                        <option value="台">台</option>
                        <option value="本">本</option>
                        <option value="枚">枚</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="m³">m³</option>
                        <option value="kg">kg</option>
                        <option value="t">t</option>
                        <option value="L">L</option>
                        <option value="式">式</option>
                        <option value="式">日</option>
                        <option value="時間">時間</option>
                        <option value="人">人</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        単価 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.unit_price}
                        onChange={(e) => handleNumericInput(index, 'unit_price', e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="0"
                        inputMode="numeric"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">税率</label>
                      <select
                        value={item.tax_rate}
                        onChange={(e) => handleItemChange(index, 'tax_rate', parseFloat(e.target.value))}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
                      >
                        <option value="10">10%</option>
                        <option value="8">8%</option>
                        <option value="0">0%</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">金額</label>
                      <div className="w-full px-2 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-right">
                        ¥{item.amount.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={addItem}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              + 明細を追加
            </button>
          </div>

          <div className="mt-6 flex justify-end">
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
                value={formData.internal_memo}
                onChange={(e) => setFormData({...formData, internal_memo: e.target.value})}
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
              onClick={(e) => handleSubmit(e as any, 'submit')}
              className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
              disabled={loading}
            >
              確定・提出
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}