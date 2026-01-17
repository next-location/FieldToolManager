'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface EstimateItem {
  id?: string
  item_type: 'construction' | 'material' | 'expense' | 'other'
  custom_type?: string
  item_name: string
  description: string
  quantity: number
  unit: string
  custom_unit?: string
  unit_price: number
  tax_rate: number
  amount: number
  display_order: number
}

interface EstimateEditFormProps {
  estimateId: string
  initialData: {
    estimate_number: string
    client_id: string
    project_id: string
    estimate_date: string
    valid_until: string
    title: string
    notes: string
    internal_notes: string
    status: string
  }
  initialItems: EstimateItem[]
  clients: Array<{ id: string; name: string; client_code: string }>
  projects: Array<{ id: string; project_name: string; project_code: string }>
}

export function EstimateEditForm({
  estimateId,
  initialData,
  initialItems,
  clients,
  projects
}: EstimateEditFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<EstimateItem[]>(initialItems.map(item => ({
    ...item,
    custom_type: item.custom_type || '',
    custom_unit: item.custom_unit || '',
  })))
  const [formData, setFormData] = useState(initialData)

  // 全角→半角変換
  const toHalfWidth = (str: string): string => {
    return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
  }

  // 数値入力ハンドラ（全角→半角変換付き）
  const handleNumericInput = (index: number, field: 'quantity' | 'unit_price', value: string) => {
    const halfWidth = toHalfWidth(value)
    const numericOnly = halfWidth.replace(/[^\d.-]/g, '')
    const numValue = parseFloat(numericOnly) || 0

    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: numValue }
    newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0)
    setItems(newItems)
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
      item_type: 'construction',
      custom_type: '',
      item_name: '',
      description: '',
      quantity: 0,
      unit: '式',
      custom_unit: '',
      unit_price: 0,
      tax_rate: 10,
      amount: 0,
      display_order: newOrder
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

  const handleSubmit = async (e: React.FormEvent, submitStatus: 'draft' | 'submitted' = 'submitted') => {
    e.preventDefault()
    setLoading(true)

    try {
      const { subtotal, taxAmount, total } = calculateTotals()

      const requestData = {
        ...formData,
        status: submitStatus,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        items: items.map((item, index) => ({
          display_order: index + 1,
          item_type: item.item_type,
          custom_type: item.custom_type,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          custom_unit: item.custom_unit,
          unit_price: item.unit_price,
          amount: item.amount,
          tax_rate: item.tax_rate
        }))
      }

      console.log('[見積書編集] リクエストデータ:', requestData)

      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[見積書編集] エラーレスポンス:', errorData)
        throw new Error(errorData.error || '見積書の更新に失敗しました')
      }

      alert(submitStatus === 'draft' ? '下書き保存しました' : '見積書を確定・提出しました')
      router.push(`/estimates/${estimateId}`)
      router.refresh()
    } catch (error) {
      console.error('[見積書編集] エラー:', error)
      alert(error instanceof Error ? error.message : '見積書の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <form onSubmit={handleSubmit} className="max-w-6xl">
      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">基本情報</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              見積番号
            </label>
            <input
              type="text"
              value={formData.estimate_number}
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
              onChange={(e) => setFormData({...formData, client_id: e.target.value})}
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
              見積日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.estimate_date}
              onChange={(e) => setFormData({...formData, estimate_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              有効期限
            </label>
            <input
              type="date"
              value={formData.valid_until}
              onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
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
              <option value="sent">送付済</option>
              <option value="accepted">承認済</option>
              <option value="rejected">却下</option>
              <option value="expired">期限切れ</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              件名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              maxLength={200}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              required
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">明細</h2>

        {/* カード形式の明細 */}
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={item.id || index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm font-medium text-gray-700">明細 #{index + 1}</span>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                  disabled={items.length === 1}
                >
                  削除
                </button>
              </div>

              <div className="space-y-3">
                {/* 種別・項目名・説明を1行 */}
                <div className="grid gap-2" style={{ gridTemplateColumns: '140px 1fr 1fr' }}>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">種別</label>
                    <select
                      value={item.item_type}
                      onChange={(e) => handleItemChange(index, 'item_type', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="construction">工事費</option>
                      <option value="material">材料費</option>
                      <option value="expense">諸経費</option>
                      <option value="other">その他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      項目名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>

                {/* 種別が「その他」の場合のカスタム種別入力 */}
                {item.item_type === 'other' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カスタム種別</label>
                    <input
                      type="text"
                      maxLength={50}
                      value={item.custom_type || ''}
                      onChange={(e) => handleItemChange(index, 'custom_type', e.target.value)}
                      placeholder="種別を入力..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                )}

                {/* 数量・単位・単価・税率・金額を1行 */}
                <div className="grid gap-2" style={{ gridTemplateColumns: '80px 100px 1fr 90px 1fr' }}>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      数量 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.quantity || ''}
                      onChange={(e) => handleNumericInput(index, 'quantity', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                      placeholder="0"
                      inputMode="numeric"
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
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
                      required
                    >
                      <option value="式">式</option>
                      <option value="個">個</option>
                      <option value="台">台</option>
                      <option value="本">本</option>
                      <option value="枚">枚</option>
                      <option value="m">m</option>
                      <option value="m²">m²</option>
                      <option value="m³">m³</option>
                      <option value="kg">kg</option>
                      <option value="t">t</option>
                      <option value="L">L</option>
                      <option value="日">日</option>
                      <option value="時間">時間</option>
                      <option value="人">人</option>
                      <option value="other">その他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      単価 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.unit_price || ''}
                      onChange={(e) => handleNumericInput(index, 'unit_price', e.target.value)}
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
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
                      className="w-full px-2 py-2 border border-gray-300 rounded-md text-sm"
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

                {/* 単位が「その他」の場合のカスタム単位入力 */}
                {item.unit === 'other' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">カスタム単位</label>
                    <input
                      type="text"
                      maxLength={20}
                      value={item.custom_unit || ''}
                      onChange={(e) => handleItemChange(index, 'custom_unit', e.target.value)}
                      placeholder="単位を入力..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 明細追加ボタン */}
        <div className="mt-4">
          <button
            type="button"
            onClick={addItem}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            + 明細を追加
          </button>
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
              備考（お客様向け）
            </label>
            <textarea
              maxLength={2000}
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
              maxLength={2000}
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
          onClick={() => router.push(`/estimates/${estimateId}`)}
          className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
        >
          キャンセル
        </button>
        <div className="space-x-2">
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, 'draft')}
            className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
            disabled={loading}
          >
            {loading ? '保存中...' : '下書き保存'}
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e as any, 'submitted')}
            className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? '提出中...' : '確定・提出'}
          </button>
        </div>
      </div>
    </form>
  )
}
