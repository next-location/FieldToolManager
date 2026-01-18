'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface Equipment {
  id: string
  equipment_code: string
  name: string
  status: string
  current_location_id: string | null
  enable_hour_meter: boolean
  current_hour_meter: number | null
  heavy_equipment_categories?: {
    name: string
  }
  sites?: {
    id: string
    name: string
  }
}

interface Location {
  id: string
  name: string
  type?: string
  is_own_location?: boolean
}

interface EquipmentMovementFormProps {
  equipment: Equipment[]
  locations: Location[]
  currentUserId: string
  currentUserName: string
  organizationSettings: any
}

export default function EquipmentMovementForm({
  equipment,
  locations,
  currentUserId,
  currentUserName,
  organizationSettings,
}: EquipmentMovementFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    equipment_id: '',
    action_type: 'checkout' as 'checkout' | 'checkin' | 'transfer',
    from_location_id: '',
    to_location_id: '',
    from_other_location: '',
    to_other_location: '',
    hour_meter_reading: '',
    notes: '',
  })

  const [equipmentSearch, setEquipmentSearch] = useState('')
  const [showEquipmentList, setShowEquipmentList] = useState(false)
  const equipmentDropdownRef = useRef<HTMLDivElement>(null)

  // 選択された重機の情報
  const selectedEquipment = equipment.find(e => e.id === formData.equipment_id)

  // ドロップダウン外側クリック検知
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (equipmentDropdownRef.current && !equipmentDropdownRef.current.contains(event.target as Node)) {
        setShowEquipmentList(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ひらがな・カタカナ変換関数
  const toKatakana = (str: string) => {
    return str.replace(/[\u3041-\u3096]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) + 0x60)
    )
  }

  const toHiragana = (str: string) => {
    return str.replace(/[\u30a1-\u30f6]/g, (match) =>
      String.fromCharCode(match.charCodeAt(0) - 0x60)
    )
  }

  // 重機検索フィルター（ひらがな・カタカナ両対応 + アクションタイプによるステータスフィルター）
  const filteredEquipment = equipment.filter(equip => {
    // アクションタイプによるステータスフィルター
    if (formData.action_type === 'checkout') {
      // 持出: 自社拠点にある利用可能な重機のみ
      if (equip.status !== 'available') return false
    } else if (formData.action_type === 'checkin') {
      // 返却: 使用中の重機のみ
      if (equip.status !== 'in_use') return false
    } else if (formData.action_type === 'transfer') {
      // 移動: 使用中の重機のみ
      if (equip.status !== 'in_use') return false
    }

    // 検索キーワードフィルター
    if (!equipmentSearch.trim()) return true
    const searchLower = equipmentSearch.toLowerCase()
    const searchKatakana = toKatakana(searchLower)
    const searchHiragana = toHiragana(searchLower)

    const targetText = `${equip.equipment_code} ${equip.name} ${equip.heavy_equipment_categories?.name || ''}`.toLowerCase()
    const targetKatakana = toKatakana(targetText)
    const targetHiragana = toHiragana(targetText)

    return targetText.includes(searchLower) ||
           targetText.includes(searchKatakana) ||
           targetText.includes(searchHiragana) ||
           targetKatakana.includes(searchLower) ||
           targetKatakana.includes(searchKatakana) ||
           targetHiragana.includes(searchLower) ||
           targetHiragana.includes(searchHiragana)
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    // 重機選択時に現在地を自動設定
    if (name === 'equipment_id') {
      const equip = equipment.find(e => e.id === value)
      if (equip) {
        setFormData(prev => ({
          ...prev,
          equipment_id: value,
          from_location_id: equip.current_location_id || '',
          hour_meter_reading: equip.current_hour_meter?.toString() || '',
        }))
      }
    }

    // アクションタイプ変更時にフォームをリセット
    if (name === 'action_type') {
      // 選択中の重機が新しいアクションで使用可能かチェック
      const newActionType = value as 'checkout' | 'checkin' | 'transfer'
      const currentEquip = equipment.find(e => e.id === formData.equipment_id)
      let shouldClearEquipment = false

      if (currentEquip) {
        if (newActionType === 'checkout' && currentEquip.status !== 'available') {
          shouldClearEquipment = true
        } else if ((newActionType === 'checkin' || newActionType === 'transfer') && currentEquip.status !== 'in_use') {
          shouldClearEquipment = true
        }
      }

      setFormData(prev => ({
        ...prev,
        equipment_id: shouldClearEquipment ? '' : prev.equipment_id,
        action_type: newActionType,
        from_location_id: value === 'checkout' ? '' : prev.from_location_id,
        to_location_id: value === 'checkin' ? '' : prev.to_location_id,
        from_other_location: '',
        to_other_location: '',
      }))

      // 重機選択をクリアした場合は検索フィールドもクリア
      if (shouldClearEquipment) {
        setEquipmentSearch('')
      }
    }

    // 「その他の場所」選択時に、対応するテキスト欄以外をクリア
    if (name === 'to_location_id' && value === 'other') {
      setFormData(prev => ({ ...prev, to_location_id: 'other' }))
    } else if (name === 'to_location_id' && value !== 'other') {
      setFormData(prev => ({ ...prev, to_other_location: '' }))
    }

    if (name === 'from_location_id' && value === 'other') {
      setFormData(prev => ({ ...prev, from_location_id: 'other' }))
    } else if (name === 'from_location_id' && value !== 'other') {
      setFormData(prev => ({ ...prev, from_other_location: '' }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')
    setSuccess('')

    try {
      if (!formData.equipment_id) {
        throw new Error('重機を選択してください')
      }

      // バリデーション
      if (formData.action_type === 'checkout') {
        if (!formData.to_location_id) {
          throw new Error('持出先を選択してください')
        }
        if (formData.to_location_id === 'other' && !formData.to_other_location.trim()) {
          throw new Error('その他の場所名を入力してください')
        }
      }
      if (formData.action_type === 'checkin') {
        if (!formData.from_location_id) {
          throw new Error('返却元を選択してください')
        }
        if (formData.from_location_id === 'other' && !formData.from_other_location.trim()) {
          throw new Error('その他の場所名を入力してください')
        }
      }
      if (formData.action_type === 'transfer') {
        if (!formData.from_location_id || !formData.to_location_id) {
          throw new Error('移動元と移動先を選択してください')
        }
        if (formData.from_location_id === 'other' && !formData.from_other_location.trim()) {
          throw new Error('移動元のその他の場所名を入力してください')
        }
        if (formData.to_location_id === 'other' && !formData.to_other_location.trim()) {
          throw new Error('移動先のその他の場所名を入力してください')
        }
      }

      // 選択された重機の組織IDを取得
      const { data: equipmentData } = await supabase
        .from('heavy_equipment')
        .select('organization_id')
        .eq('id', formData.equipment_id)
        .single()

      if (!equipmentData) {
        throw new Error('重機データの取得に失敗しました')
      }

      // 使用記録を作成
      const usageRecordData = {
        organization_id: equipmentData.organization_id,
        equipment_id: formData.equipment_id,
        user_id: currentUserId,
        action_type: formData.action_type,
        from_location_id: formData.from_location_id === 'other' ? null : (formData.from_location_id || null),
        to_location_id: formData.to_location_id === 'other' ? null : (formData.to_location_id || null),
        other_location_name: formData.from_location_id === 'other'
          ? formData.from_other_location
          : (formData.to_location_id === 'other' ? formData.to_other_location : null),
        hour_meter_reading: formData.hour_meter_reading ? parseFloat(formData.hour_meter_reading) : null,
        notes: formData.notes || null,
        action_at: new Date().toISOString(),
      }

      const { error: insertError } = await supabase
        .from('heavy_equipment_usage_records')
        .insert(usageRecordData)

      if (insertError) throw insertError

      // 重機の現在地とステータスを更新
      let newStatus = selectedEquipment?.status
      let newLocationId: string | null = selectedEquipment?.current_location_id || null
      let newUserId: string | null = currentUserId

      if (formData.action_type === 'checkout') {
        newStatus = 'in_use'
        // 持出: 目的地を現在地に設定（その他の場所の場合はnull）
        newLocationId = formData.to_location_id === 'other' ? null : formData.to_location_id
        newUserId = currentUserId
      } else if (formData.action_type === 'checkin') {
        newStatus = 'available'
        // 返却: 自社拠点に戻すのでnull
        newLocationId = null
        newUserId = null
      } else if (formData.action_type === 'transfer') {
        // 移動: 移動先を現在地に設定（その他の場所の場合はnull）
        newLocationId = formData.to_location_id === 'other' ? null : formData.to_location_id
      }

      const updateData: any = {
        current_location_id: newLocationId,
        status: newStatus,
        current_user_id: newUserId,
        updated_at: new Date().toISOString(),
      }

      // メーター記録がある場合は更新
      if (formData.hour_meter_reading && selectedEquipment?.enable_hour_meter) {
        updateData.current_hour_meter = parseFloat(formData.hour_meter_reading)
      }

      const { error: updateError } = await supabase
        .from('heavy_equipment')
        .update(updateData)
        .eq('id', formData.equipment_id)

      if (updateError) throw updateError

      // 移動履歴ページへリダイレクト（成功メッセージ付き）
      router.push('/movements?success=重機の移動記録を登録しました&tab=equipment')
    } catch (err: any) {
      console.error('移動記録エラー:', err)
      setError(err.message || '移動記録の登録に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">エラー</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">成功</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>{success}</p>
              </div>
            </div>
          </div>
        </div>
      )}
          {/* アクションタイプ選択 */}
          <div>
            <label htmlFor="action_type" className="block text-sm font-medium text-gray-700 mb-2">
              操作タイプ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, action_type: 'checkout' })}
                className={`px-4 py-3 text-sm font-medium rounded-md border ${
                  formData.action_type === 'checkout'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                持出
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, action_type: 'checkin' })}
                className={`px-4 py-3 text-sm font-medium rounded-md border ${
                  formData.action_type === 'checkin'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
                返却
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, action_type: 'transfer' })}
                className={`px-4 py-3 text-sm font-medium rounded-md border ${
                  formData.action_type === 'transfer'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                移動
              </button>
            </div>
          </div>

          {/* 重機選択 */}
          <div className="relative" ref={equipmentDropdownRef}>
            <label htmlFor="equipment_search" className="block text-sm font-medium text-gray-700 mb-2">
              重機 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="equipment_search"
              name="equipment_search"
              value={equipmentSearch}
              onChange={(e) => {
                setEquipmentSearch(e.target.value)
                setShowEquipmentList(true)
              }}
              onFocus={() => setShowEquipmentList(true)}
              placeholder="重機名、重機コード、カテゴリで検索..."
              autoComplete="off"
              className={`block w-full border rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                !formData.equipment_id ? 'border-gray-300' : 'border-green-500 bg-green-50'
              }`}
            />
            <input type="hidden" name="equipment_id" value={formData.equipment_id} required />
            {!formData.equipment_id && equipmentSearch && (
              <p className="mt-1 text-xs text-orange-600">
                ⚠️ ドロップダウンから重機を選択してください
              </p>
            )}

            {/* 検索結果ドロップダウン */}
            {showEquipmentList && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredEquipment.length > 0 ? (
                  filteredEquipment.map((equip) => (
                    <button
                      key={equip.id}
                      type="button"
                      onClick={async () => {
                        // current_location_idがnullの場合、最新の移動履歴から「その他の場所」情報を取得
                        let otherLocationName = ''
                        if (!equip.current_location_id && (formData.action_type === 'checkin' || formData.action_type === 'transfer')) {
                          const { data: latestMovement } = await supabase
                            .from('heavy_equipment_usage_records')
                            .select('other_location_name')
                            .eq('equipment_id', equip.id)
                            .order('action_at', { ascending: false })
                            .limit(1)
                            .single()

                          if (latestMovement?.other_location_name) {
                            otherLocationName = latestMovement.other_location_name
                          }
                        }

                        setFormData(prev => {
                          const update: any = {
                            ...prev,
                            equipment_id: equip.id,
                            hour_meter_reading: equip.current_hour_meter?.toString() || '',
                          }

                          // アクションタイプに応じて現在地を設定
                          if (prev.action_type === 'checkin') {
                            // 返却: 現在地を返却元に設定
                            if (equip.current_location_id) {
                              update.from_location_id = equip.current_location_id
                            } else {
                              // その他の場所から返却
                              update.from_location_id = 'other'
                              update.from_other_location = otherLocationName
                            }
                          } else if (prev.action_type === 'transfer') {
                            // 移動: 現在地を移動元に設定
                            if (equip.current_location_id) {
                              update.from_location_id = equip.current_location_id
                            } else {
                              // その他の場所から移動
                              update.from_location_id = 'other'
                              update.from_other_location = otherLocationName
                            }
                          }
                          // checkout の場合は現在地設定不要（自社拠点から持ち出すため）

                          return update
                        })
                        setEquipmentSearch(`${equip.equipment_code} - ${equip.name}`)
                        setShowEquipmentList(false)
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-200"
                    >
                      <div className="font-medium text-sm">
                        {equip.equipment_code} - {equip.name}
                      </div>
                      {equip.sites && (
                        <div className="text-xs text-gray-500">現在地: {equip.sites.name}</div>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-gray-500">該当する重機が見つかりません</div>
                )}
              </div>
            )}

            {selectedEquipment && !showEquipmentList && (
              <p className="mt-1 text-xs text-gray-500">
                選択中: {selectedEquipment.equipment_code} - {selectedEquipment.name}
              </p>
            )}
          </div>

          {/* 選択された重機の情報表示 */}
          {selectedEquipment && (
            <div className="bg-blue-50 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">選択中の重機</h4>
              <dl className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-blue-700">重機名</dt>
                  <dd className="text-blue-900 font-medium">{selectedEquipment.name}</dd>
                </div>
                <div>
                  <dt className="text-blue-700">カテゴリ</dt>
                  <dd className="text-blue-900">{selectedEquipment.heavy_equipment_categories?.name || '未設定'}</dd>
                </div>
                <div>
                  <dt className="text-blue-700">現在地</dt>
                  <dd className="text-blue-900">{selectedEquipment.sites?.name || '未設定'}</dd>
                </div>
                <div>
                  <dt className="text-blue-700">ステータス</dt>
                  <dd className="text-blue-900">
                    {selectedEquipment.status === 'available' && '利用可能'}
                    {selectedEquipment.status === 'in_use' && '使用中'}
                    {selectedEquipment.status === 'maintenance' && '点検中'}
                    {selectedEquipment.status === 'out_of_service' && '使用不可'}
                  </dd>
                </div>
                {selectedEquipment.enable_hour_meter && (
                  <div>
                    <dt className="text-blue-700">現在のメーター</dt>
                    <dd className="text-blue-900">{selectedEquipment.current_hour_meter || 0} 時間</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* 持出の場合 */}
          {formData.action_type === 'checkout' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="to_location_id" className="block text-sm font-medium text-gray-700 mb-2">
                  持出先 <span className="text-red-500">*</span>
                </label>
                <select
                  id="to_location_id"
                  name="to_location_id"
                  value={formData.to_location_id}
                  onChange={handleChange}
                  required
                  className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">選択してください</option>
                  {locations.filter(loc => loc.is_own_location).length > 0 && (
                    <optgroup label="━━ 自社拠点 ━━">
                      {locations.filter(loc => loc.is_own_location).map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {locations.filter(loc => !loc.is_own_location).length > 0 && (
                    <optgroup label="━━ 顧客現場 ━━">
                      {locations.filter(loc => !loc.is_own_location).map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <option value="other">その他の場所</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">自社拠点、顧客現場、またはその他の場所を選択してください</p>
              </div>

              {formData.to_location_id === 'other' && (
                <div>
                  <label htmlFor="to_other_location" className="block text-sm font-medium text-gray-700 mb-2">
                    その他の場所名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="to_other_location"
                    name="to_other_location"
                    value={formData.to_other_location}
                    onChange={handleChange}
                    required
                    maxLength={100}
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例: ○○商事（取引先）、△△市役所（営業先）"
                  />
                </div>
              )}
            </div>
          )}

          {/* 返却の場合 */}
          {formData.action_type === 'checkin' && (
            <div className="space-y-3">
              <div>
                <label htmlFor="from_location_id" className="block text-sm font-medium text-gray-700 mb-2">
                  返却元（自動設定）
                </label>
                <div className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                  {selectedEquipment?.sites?.name ||
                   (formData.from_location_id === 'other' && formData.from_other_location
                     ? `その他の場所: ${formData.from_other_location}`
                     : (formData.from_location_id === 'other' ? 'その他の場所' : '現在地情報なし'))}
                </div>
                <p className="mt-1 text-xs text-gray-500">選択した重機の現在地が自動的に設定されます</p>
                <input type="hidden" name="from_location_id" value={formData.from_location_id} />
              </div>

              <input
                type="hidden"
                name="from_other_location"
                value={formData.from_other_location}
              />
            </div>
          )}

          {/* 移動の場合 */}
          {formData.action_type === 'transfer' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label htmlFor="from_location_id" className="block text-sm font-medium text-gray-700 mb-2">
                    移動元（自動設定）
                  </label>
                  <div className="block w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                    {selectedEquipment?.sites?.name ||
                     (formData.from_location_id === 'other' && formData.from_other_location
                       ? `その他の場所: ${formData.from_other_location}`
                       : (formData.from_location_id === 'other' ? 'その他の場所' : '現在地情報なし'))}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">選択した重機の現在地が自動的に設定されます</p>
                  <input type="hidden" name="from_location_id" value={formData.from_location_id} />
                </div>
                <input
                  type="hidden"
                  name="from_other_location"
                  value={formData.from_other_location}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <label htmlFor="to_location_id" className="block text-sm font-medium text-gray-700 mb-2">
                    移動先 <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="to_location_id"
                    name="to_location_id"
                    value={formData.to_location_id}
                    onChange={handleChange}
                    required
                    className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">選択してください</option>
                    {locations.filter(loc => loc.is_own_location).length > 0 && (
                      <optgroup label="━━ 自社拠点 ━━">
                        {locations.filter(loc => loc.is_own_location).map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {locations.filter(loc => !loc.is_own_location).length > 0 && (
                      <optgroup label="━━ 顧客現場 ━━">
                        {locations.filter(loc => !loc.is_own_location).map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <option value="other">その他の場所</option>
                  </select>
                </div>

                {formData.to_location_id === 'other' && (
                  <div>
                    <label htmlFor="to_other_location" className="block text-sm font-medium text-gray-700 mb-2">
                      移動先のその他の場所名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="to_other_location"
                      name="to_other_location"
                      value={formData.to_other_location}
                      onChange={handleChange}
                      required
                      maxLength={100}
                      className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="例: △△市役所（営業先）"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* メーター記録（オプション） */}
          {selectedEquipment?.enable_hour_meter && (
            <div>
              <label htmlFor="hour_meter_reading" className="block text-sm font-medium text-gray-700 mb-2">
                アワーメーター値（時間）
              </label>
              <input
                type="number"
                step="0.1"
                id="hour_meter_reading"
                name="hour_meter_reading"
                value={formData.hour_meter_reading}
                onChange={handleChange}
                className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`現在: ${selectedEquipment.current_hour_meter || 0} 時間`}
              />
            </div>
          )}

          {/* 備考 */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              備考
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="特記事項があれば入力してください"
            />
          </div>

          {/* ボタン */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '記録中...' : '記録する'}
            </button>
          </div>
    </form>
  )
}
