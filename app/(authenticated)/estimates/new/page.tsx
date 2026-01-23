import { requireAuth } from '@/lib/auth/page-auth'
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchWithCsrf } from '@/lib/csrf-client'

interface EstimateItem {
  id: string
  item_type: 'construction' | 'material' | 'expense' | 'other'
  custom_type?: string // 「その他」選択時のカスタム種別
  item_name: string
  description: string
  quantity: number
  unit: string
  custom_unit?: string // 「その他」選択時のカスタム単位
  unit_price: number
  tax_rate: number
  amount: number
}

export default function NewEstimatePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [allProjects, setAllProjects] = useState<any[]>([])
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false)
  const clientDropdownRef = useRef<HTMLDivElement>(null)
  const [projectSearchQuery, setProjectSearchQuery] = useState('')
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)

  const [items, setItems] = useState<EstimateItem[]>([
    {
      id: '1',
      item_type: 'construction',
      custom_type: '',
      item_name: '',
      description: '',
      quantity: 0,
      unit: '式',
      custom_unit: '',
      unit_price: 0,
      tax_rate: 10,
      amount: 0
    }
  ])

  const [formData, setFormData] = useState({
    estimate_number: '',
    client_id: '',
    project_id: '',
    estimate_date: new Date().toISOString().split('T')[0],
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    title: '',
    notes: '',
    internal_notes: ''
  })

  useEffect(() => {
    fetchClients()
    fetchProjects()
    generateEstimateNumber()
  }, [])

  // ドロップダウン外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target as Node)) {
        setIsClientDropdownOpen(false)
        setClientSearchQuery('')
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false)
        setProjectSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?is_active=true&limit=1000')
      if (response.ok) {
        const result = await response.json()
        const filteredData = result.data?.filter((c: any) =>
          c.client_type === 'customer' || c.client_type === 'both'
        ) || []
        setClients(filteredData)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects?limit=1000')
      if (response.ok) {
        const result = await response.json()
        const filteredData = result.data?.filter((p: any) =>
          ['planning', 'in_progress'].includes(p.status)
        ) || []
        setAllProjects(filteredData)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    }
  }

  const generateEstimateNumber = async () => {
    try {
      const year = new Date().getFullYear()
      const response = await fetch(`/api/estimates?limit=1000&search=EST-${year}-`)
      if (response.ok) {
        const result = await response.json()
        const data = result.data || []

        if (data.length > 0) {
          const codes = data
            .map((e: any) => e.estimate_number)
            .filter((code: string) => code.startsWith(`EST-${year}-`))

          if (codes.length > 0) {
            const numbers = codes.map((code: string) => {
              const parts = code.split('-')
              return parseInt(parts[2] || '0')
            })
            const maxNumber = Math.max(...numbers)
            setFormData(prev => ({
              ...prev,
              estimate_number: `EST-${year}-${String(maxNumber + 1).padStart(4, '0')}`
            }))
          } else {
            setFormData(prev => ({
              ...prev,
              estimate_number: `EST-${year}-0001`
            }))
          }
        } else {
          setFormData(prev => ({
            ...prev,
            estimate_number: `EST-${year}-0001`
          }))
        }
      }
    } catch (error) {
      console.error('Error generating estimate number:', error)
      const year = new Date().getFullYear()
      setFormData(prev => ({
        ...prev,
        estimate_number: `EST-${year}-0001`
      }))
    }
  }

  // ひらがなをカタカナに変換
  const hiraganaToKatakana = (str: string) => {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      const chr = match.charCodeAt(0) + 0x60
      return String.fromCharCode(chr)
    })
  }

  // 取引先フィルタリング
  const filteredClients = clients.filter(client => {
    if (!clientSearchQuery) return true

    const query = clientSearchQuery.toLowerCase()
    const queryKatakana = hiraganaToKatakana(query)

    return (
      client.name?.toLowerCase().includes(query) ||
      client.name_kana?.toLowerCase().includes(query) ||
      client.name_kana?.toLowerCase().includes(queryKatakana.toLowerCase()) ||
      client.client_code?.toLowerCase().includes(query)
    )
  })

  // 選択された取引先名を取得
  const selectedClientName = clients.find(c => c.id === formData.client_id)?.name || ''

  // 取引先に紐づいた工事のみフィルタ
  const clientProjects = formData.client_id
    ? allProjects.filter(p => p.client_id === formData.client_id)
    : []

  // 工事フィルタリング（検索対応）
  const filteredProjects = clientProjects.filter(project => {
    if (!projectSearchQuery) return true

    const query = projectSearchQuery.toLowerCase()

    return (
      project.project_name?.toLowerCase().includes(query) ||
      project.project_code?.toLowerCase().includes(query)
    )
  })

  // 選択された工事名を取得
  const selectedProjectName = allProjects.find(p => p.id === formData.project_id)?.project_name || ''

  // 工事選択時に件名を自動設定する関数
  const handleProjectSelect = (projectId: string) => {
    const project = allProjects.find(p => p.id === projectId)
    if (project) {
      setFormData({
        ...formData,
        project_id: projectId,
        title: `${project.project_name} 見積書`
      })
    } else {
      setFormData({
        ...formData,
        project_id: projectId
      })
    }
  }

  // 全角数字を半角に変換
  const toHalfWidth = (str: string): string => {
    return str.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items]

    // 数値フィールドの場合、全角数字を半角に変換してから数値化
    if (field === 'quantity' || field === 'unit_price') {
      if (typeof value === 'string') {
        const halfWidth = toHalfWidth(value)
        const numValue = parseFloat(halfWidth) || 0
        newItems[index] = { ...newItems[index], [field]: numValue }
      } else {
        newItems[index] = { ...newItems[index], [field]: value }
      }
      // 金額を再計算
      newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0)
    } else {
      newItems[index] = { ...newItems[index], [field]: value }
    }

    setItems(newItems)
  }

  // 数値入力ハンドラ（入力時にリアルタイムで全角→半角変換）
  const handleNumericInput = (index: number, field: 'quantity' | 'unit_price', value: string) => {
    // 全角数字を半角に即座に変換
    const halfWidth = toHalfWidth(value)
    // 数値以外の文字を除去
    const numericOnly = halfWidth.replace(/[^\d.-]/g, '')
    // 数値化して状態を更新
    const numValue = parseFloat(numericOnly) || 0

    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: numValue }
    // 金額を再計算
    newItems[index].amount = (newItems[index].quantity || 0) * (newItems[index].unit_price || 0)
    setItems(newItems)
  }

  const addItem = () => {
    setItems([...items, {
      id: String(items.length + 1),
      item_type: 'construction',
      custom_type: '',
      item_name: '',
      description: '',
      quantity: 0,
      unit: '式',
      custom_unit: '',
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

  const handleSubmit = async (e: React.FormEvent, submitStatus: 'draft' | 'submitted' = 'draft') => {
    e.preventDefault()
    setLoading(true)

    try {
      const { subtotal, taxAmount, total } = calculateTotals()

      const estimateData = {
        ...formData,
        subtotal,
        tax_amount: taxAmount,
        total_amount: total,
        status: submitStatus,
        items: items.map((item, index) => ({
          display_order: index + 1,
          item_type: item.item_type, // カスタム種別はcustom_typeで送る
          custom_type: item.item_type === 'other' ? item.custom_type : undefined,
          item_name: item.item_name,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit, // カスタム単位はcustom_unitで送る
          custom_unit: item.unit === 'other' ? item.custom_unit : undefined,
          unit_price: item.unit_price,
          amount: item.amount,
          tax_rate: item.tax_rate
        }))
      }

      console.log('[見積書作成] リクエストデータ:', estimateData)

      const response = await fetchWithCsrf('/api/estimates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(estimateData),
      })

      console.log('[見積書作成] レスポンスステータス:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[見積書作成] エラーレスポンス:', errorData)
        throw new Error(errorData.error || `見積書の作成に失敗しました (${response.status})`)
      }

      const result = await response.json()
      console.log('[見積書作成] 成功:', result)

      router.push('/estimates')
      router.refresh()
    } catch (error) {
      console.error('[見積書作成] エラー:', error)
      alert(error instanceof Error ? error.message : '見積書の作成に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const { subtotal, taxAmount, total } = calculateTotals()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-8">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">見積書作成</h1>
          <p className="mt-1 text-sm text-gray-600">
            見積書情報を登録します。必須項目を入力してください。
          </p>
        </div>

        <form onSubmit={(e) => handleSubmit(e, 'draft')}>
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
              <div className="relative" ref={clientDropdownRef}>
                <input
                  type="text"
                  value={isClientDropdownOpen ? clientSearchQuery : selectedClientName}
                  onChange={(e) => {
                    setClientSearchQuery(e.target.value)
                    setIsClientDropdownOpen(true)
                  }}
                  onFocus={() => setIsClientDropdownOpen(true)}
                  placeholder="取引先を検索..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />

                <button
                  type="button"
                  onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isClientDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredClients.length > 0 ? (
                      <ul>
                        {filteredClients.map(client => (
                          <li key={client.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({...formData, client_id: client.id, project_id: ''})
                                setClientSearchQuery('')
                                setIsClientDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col"
                            >
                              <span className="font-medium">{client.name}</span>
                              <span className="text-xs text-gray-500">
                                {client.client_code}
                                {client.name_kana && ` / ${client.name_kana}`}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        該当する取引先が見つかりません
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formData.client_id && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, client_id: '', project_id: ''})
                    setClientSearchQuery('')
                  }}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  選択をクリア
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                工事
              </label>
              <div className="relative" ref={projectDropdownRef}>
                <input
                  type="text"
                  value={isProjectDropdownOpen ? projectSearchQuery : selectedProjectName}
                  onChange={(e) => {
                    setProjectSearchQuery(e.target.value)
                    setIsProjectDropdownOpen(true)
                  }}
                  onFocus={() => setIsProjectDropdownOpen(true)}
                  placeholder={formData.client_id ? "工事を検索..." : "先に取引先を選択してください"}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!formData.client_id}
                />

                <button
                  type="button"
                  onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={!formData.client_id}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isProjectDropdownOpen && formData.client_id && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredProjects.length > 0 ? (
                      <ul>
                        {filteredProjects.map(project => (
                          <li key={project.id}>
                            <button
                              type="button"
                              onClick={() => {
                                handleProjectSelect(project.id)
                                setProjectSearchQuery('')
                                setIsProjectDropdownOpen(false)
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-blue-50 flex flex-col"
                            >
                              <span className="font-medium">{project.project_name}</span>
                              <span className="text-xs text-gray-500">
                                {project.project_code}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">
                        この取引先に紐づいた工事がありません
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formData.project_id && (
                <button
                  type="button"
                  onClick={() => {
                    setFormData({...formData, project_id: ''})
                    setProjectSearchQuery('')
                  }}
                  className="mt-1 text-xs text-blue-600 hover:text-blue-700"
                >
                  選択をクリア
                </button>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                見積日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.estimate_date}
                onChange={(e) => setFormData({...formData, estimate_date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ lineHeight: '1.5rem', height: '2.5rem' }}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                style={{ lineHeight: '1.5rem', height: '2.5rem' }}
              />
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
                placeholder="〇〇工事 見積書"
              />
            </div>
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
                        maxLength={50}
                        value={item.custom_type || ''}
                        onChange={(e) => handleItemChange(index, 'custom_type', e.target.value)}
                        placeholder="種別を入力..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                      maxLength={100}
                      value={item.item_name}
                      onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      required
                    />
                  </div>

                  {/* 説明 */}
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

                  {/* 数量・単位 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        数量 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={item.quantity || ''}
                        onChange={(e) => handleNumericInput(index, 'quantity', e.target.value)}
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
                        value={item.unit}
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
                        maxLength={20}
                        value={item.custom_unit || ''}
                        onChange={(e) => handleItemChange(index, 'custom_unit', e.target.value)}
                        placeholder="単位を入力..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
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
                        onChange={(e) => handleNumericInput(index, 'unit_price', e.target.value)}
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
                備考（お客様向け）
              </label>
              <textarea
                maxLength={2000}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="見積書に記載される備考"
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
                placeholder="社内用のメモ（見積書には記載されません）"
              />
            </div>
          </div>
        </div>

        {/* フォームフッター */}
        <div className="px-4 py-3 bg-white sm:px-6 sm:rounded-b-lg">
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => router.push('/estimates')}
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
              {loading ? '提出中...' : '提出'}
            </button>
          </div>
        </div>
      </form>
      </div>
    </div>
  )
}
