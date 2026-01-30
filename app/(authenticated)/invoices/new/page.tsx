'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

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
  custom_type?: string
  custom_unit?: string
}

export default function NewInvoicePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const estimateId = searchParams.get('estimate_id')
  const [loading, setLoading] = useState(false)
  const [userRole, setUserRole] = useState<string>('')
  const [csrfToken, setCsrfToken] = useState<string>('')
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
    fetchUserRole()
    fetchCsrfToken()

    // 見積書から変換の場合
    if (estimateId) {
      loadEstimateData(estimateId)
    }
  }, [estimateId])

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch('/api/csrf-token')
      const data = await response.json()
      setCsrfToken(data.token)
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error)
    }
  }

  const fetchUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', user?.id)
      .single()

    if (data) {
      setUserRole(data.role)
      // リーダー以上のみ請求書作成可能
      if (!['leader', 'manager', 'admin', 'super_admin'].includes(data.role)) {
        alert('請求書の作成はリーダー以上の権限が必要です')
        router.push('/invoices')
      }
    }
  }

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, client_code, payment_terms, payment_due_days, client_type')
      .eq('is_active', true)
      .in('client_type', ['customer', 'both']) // 顧客と顧客兼仕入先のみ
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

    if (userData?.organization_id) {
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

  const handleSubmit = async (e: React.FormEvent, status: 'draft' | 'submitted' = 'draft') => {
    e.preventDefault()
    setLoading(true)

    try {
      const { subtotal, taxAmount, total } = calculateTotals()

      // サーバーサイドAPIを使用して作成
      const response = await fetch('/api/invoices/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoiceData: {
            ...formData,
            estimate_id: estimateId || null,
            subtotal,
            tax_amount: taxAmount,
            total_amount: total,
          },
          items: items.map((item) => ({
            item_type: item.item_type,
            item_name: item.item_name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unit_price: item.unit_price,
            amount: item.amount,
            tax_rate: item.tax_rate
          })),
          status
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '請求書の作成に失敗しました')
      }

      router.push('/invoices')
    } catch (error: any) {
      console.error('Error creating invoice:', error)
      alert(error.message || '請求書の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">請求書作成</h1>
          <p className="mt-1 text-sm text-gray-600">
            {estimateId ? '見積書から作成' : '請求書情報を登録します。必須項目を入力してください。'}
          </p>
        </div>

      <form onSubmit={handleSubmit}>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left [appearance:none]"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-left [appearance:none]"
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
                maxLength={200}
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
          <h2 className="text-lg font-semibold mb-4">明細</h2>

          {/* カード表示（全サイズ共通） */}
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
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
                  {/* 種別 */}
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

                  {/* 種別が「その他」の場合のカスタム種別入力 */}
                  {item.item_type === 'other' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">カスタム種別</label>
                      <input
                        type="text"
                        value={item.custom_type || ''}
                        onChange={(e) => handleItemChange(index, 'custom_type', e.target.value)}
                        placeholder="種別を入力..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        maxLength={50}
                      />
                    </div>
                  )}

                  {/* 項目名 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      項目名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={item.item_name || ''}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                      maxLength={100}
                    />
                  </div>

                  {/* 説明 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">説明</label>
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      maxLength={200}
                    />
                  </div>

                  {/* 数量・単位 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        数量 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                        value={item.unit || ''}
                        onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                  </div>

                  {/* 単位が「その他」の場合のカスタム単位入力 */}
                  {item.unit === 'other' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">カスタム単位</label>
                      <input
                        type="text"
                        value={item.custom_unit || ''}
                        onChange={(e) => handleItemChange(index, 'custom_unit', e.target.value)}
                        placeholder="単位を入力..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        maxLength={20}
                      />
                    </div>
                  )}

                  {/* 単価・税率 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        単価 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.unit_price || ''}
                        onChange={(e) => handleItemChange(index, 'unit_price', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="10">10%</option>
                        <option value="8">8%</option>
                        <option value="0">0%</option>
                      </select>
                    </div>
                  </div>

                  {/* 金額 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">金額</label>
                    <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-sm font-medium text-right">
                      ¥{item.amount.toLocaleString()}
                    </div>
                  </div>
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
                備考（請求書に記載）
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="お振込手数料はお客様ご負担でお願いいたします。"
                maxLength={2000}
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
                maxLength={2000}
              />
            </div>
          </div>
        </div>

        {/* フォームフッター */}
        <div className="px-4 py-3 bg-white sm:px-6 sm:rounded-b-lg">
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push('/invoices')}
              className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              disabled={loading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              onClick={(e) => handleSubmit(e as any, 'draft')}
              className="inline-flex justify-center rounded-md border border-transparent bg-gray-500 py-2 px-3 text-sm font-medium text-white shadow-sm hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '保存中...' : '下書き'}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e as any, 'submitted')}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? '提出中...' : userRole && ['manager', 'admin', 'super_admin'].includes(userRole) ? '承認' : '提出'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}