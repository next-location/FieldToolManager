import { requireAuth } from '@/lib/auth/page-auth'
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

interface OrderItem {
  id?: string
  item_type: 'material' | 'labor' | 'subcontract' | 'equipment' | 'other'
  item_name: string
  description: string | null
  quantity: number
  unit: string
  unit_price: number
  tax_rate: number
  amount: number
  display_order: number
}

export default function EditPurchaseOrderPage({
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
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [orderId, setOrderId] = useState<string>('')
  const [formData, setFormData] = useState({
    order_number: '',
    client_id: '',
    project_id: '',
    order_date: '',
    delivery_date: '',
    delivery_location: '',
    payment_terms: '',
    notes: '',
    status: 'draft'
  })

  useEffect(() => {
    params.then(p => setOrderId(p.id))
  }, [params])

  useEffect(() => {
    if (!orderId) return
    fetchSuppliers()
    fetchProjects()
    fetchOrder()
  }, [orderId])

  const fetchOrder = async () => {
    const { data: order } = await supabase
      .from('purchase_orders')
      .select(`
        *,
        purchase_order_items(*)
      `)
      .eq('id', orderId)
      .single()

    if (order) {
      setFormData({
        order_number: order.order_number || '',
        client_id: order.client_id || '',
        project_id: order.project_id || '',
        order_date: order.order_date || '',
        delivery_date: order.delivery_date || '',
        delivery_location: order.delivery_location || '',
        payment_terms: order.payment_terms || '',
        notes: order.notes || '',
        status: order.status || 'draft'
      })

      if (order.purchase_order_items) {
        setItems(order.purchase_order_items.sort((a: any, b: any) => a.display_order - b.display_order))
      }
    }
  }

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
      .in('status', ['planning', 'in_progress'])
      .order('project_name')

    if (data) setProjects(data)
  }

  const handleProjectChange = (projectId: string) => {
    setFormData({ ...formData, project_id: projectId })
  }

  const handleSupplierChange = (clientId: string) => {
    setFormData({ ...formData, client_id: clientId })

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
      newItems[index].amount = newItems[index].quantity * newItems[index].unit_price
    }

    setItems(newItems)
  }

  const addItem = () => {
    const newOrder = items.length > 0 ? Math.max(...items.map(i => i.display_order)) + 1 : 1
    setItems([...items, {
      item_type: 'material',
      item_name: '',
      description: null,
      quantity: 1,
      unit: '個',
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
          .from('purchase_order_items')
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

  const handleSubmit = async (e: React.FormEvent, shouldSubmit: boolean = false) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { subtotal, taxAmount, total } = calculateTotals()

      // 発注書データと明細データを準備
      const orderData = {
        client_id: formData.client_id || null,
        project_id: formData.project_id || null,
        order_date: formData.order_date,
        delivery_date: formData.delivery_date,
        delivery_location: formData.delivery_location,
        payment_terms: formData.payment_terms,
        notes: formData.notes,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
      }

      const itemsData = items.map((item, index) => ({
        display_order: index + 1,
        item_type: item.item_type,
        item_name: item.item_name,
        description: item.description || null,
        quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) || 0 : item.quantity,
        unit: item.unit,
        unit_price: typeof item.unit_price === 'string' ? parseFloat(item.unit_price) || 0 : item.unit_price,
        amount: item.amount,
        tax_rate: item.tax_rate
      }))

      if (shouldSubmit) {
        // 確定・提出の場合は、まず下書き保存して（履歴記録なし）、その後提出APIで履歴記録
        const updateResponse = await fetch(`/api/purchase-orders/${orderId}/update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData,
            items: itemsData
          })
        })

        if (!updateResponse.ok) {
          const error = await updateResponse.json()
          throw new Error(error.error || '保存に失敗しました')
        }

        // 提出APIを呼ぶ（履歴記録あり）
        const submitResponse = await fetch(`/api/purchase-orders/${orderId}/submit`, {
          method: 'POST',
        })

        if (!submitResponse.ok) {
          const error = await submitResponse.json()
          throw new Error(error.error || '承認申請に失敗しました')
        }

        alert('発注書を更新して提出しました')
      } else {
        // 下書き保存の場合は、update-draftを呼ぶ（履歴記録あり）
        const saveResponse = await fetch(`/api/purchase-orders/${orderId}/update-draft`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderData,
            items: itemsData
          })
        })

        if (!saveResponse.ok) {
          const error = await saveResponse.json()
          throw new Error(error.error || '保存に失敗しました')
        }

        alert('発注書を更新しました')
      }

      router.push(`/purchase-orders/${orderId}`)
    } catch (error) {
      console.error('Error submitting purchase order:', error)
      alert(error instanceof Error ? error.message : '発注書の提出に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">発注書編集</h1>
        <p className="text-gray-600">{formData.order_number}</p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-[42px] appearance-none"
                style={{ WebkitAppearance: 'none' }}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md h-[42px] appearance-none"
                style={{ WebkitAppearance: 'none' }}
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
                <option value="ordered">発注済</option>
                <option value="delivered">納品済</option>
                <option value="paid">支払済</option>
              </select>
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
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払条件
              </label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">発注明細</h2>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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
                        value={item.description || ''}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="仕様や規格を入力"
                      />
                    </div>
                  </div>

                  {/* 数量・単位・単価・税率・金額を1行 */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        数量 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="0"
                        step="0.01"
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
                        <option value="日">日</option>
                        <option value="時間">時間</option>
                        <option value="人">人</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        単価 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm bg-white"
                        placeholder="0"
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
                備考
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push(`/purchase-orders/${orderId}`)}
            className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
            disabled={loading}
          >
            キャンセル
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, false)}
              className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
              disabled={loading}
            >
              {loading ? '保存中...' : '下書き保存'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? '提出中...' : '確定・提出'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
