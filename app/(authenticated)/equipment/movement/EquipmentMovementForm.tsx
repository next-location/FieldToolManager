'use client'

import { useState } from 'react'
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

interface Site {
  id: string
  name: string
  site_type: string
}

interface EquipmentMovementFormProps {
  equipment: Equipment[]
  sites: Site[]
  currentUserId: string
  currentUserName: string
  organizationSettings: any
}

export default function EquipmentMovementForm({
  equipment,
  sites,
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
    hour_meter_reading: '',
    notes: '',
  })

  // 選択された重機の情報
  const selectedEquipment = equipment.find(e => e.id === formData.equipment_id)

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
      setFormData(prev => ({
        ...prev,
        action_type: value as 'checkout' | 'checkin' | 'transfer',
        from_location_id: value === 'checkout' ? '' : prev.from_location_id,
        to_location_id: value === 'checkin' ? '' : prev.to_location_id,
      }))
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
      if (formData.action_type === 'checkout' && !formData.to_location_id) {
        throw new Error('持出先を選択してください')
      }
      if (formData.action_type === 'checkin' && !formData.from_location_id) {
        throw new Error('返却元を選択してください')
      }
      if (formData.action_type === 'transfer' && (!formData.from_location_id || !formData.to_location_id)) {
        throw new Error('移動元と移動先を選択してください')
      }

      // 使用記録を作成
      const usageRecordData = {
        equipment_id: formData.equipment_id,
        user_id: currentUserId,
        action_type: formData.action_type,
        from_location_id: formData.from_location_id || null,
        to_location_id: formData.to_location_id || null,
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
      let newLocationId = selectedEquipment?.current_location_id
      let newUserId: string | null = currentUserId

      if (formData.action_type === 'checkout') {
        newStatus = 'in_use'
        newLocationId = formData.to_location_id
        newUserId = currentUserId
      } else if (formData.action_type === 'checkin') {
        newStatus = 'available'
        newLocationId = formData.from_location_id
        newUserId = null
      } else if (formData.action_type === 'transfer') {
        newLocationId = formData.to_location_id
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

      setSuccess('移動記録を登録しました')

      // フォームをリセット
      setFormData({
        equipment_id: '',
        action_type: 'checkout',
        from_location_id: '',
        to_location_id: '',
        hour_meter_reading: '',
        notes: '',
      })

      // 画面をリフレッシュ
      router.refresh()

      // 3秒後に成功メッセージを消す
      setTimeout(() => setSuccess(''), 3000)
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
          <div>
            <label htmlFor="equipment_id" className="block text-sm font-medium text-gray-700">
              重機 <span className="text-red-500">*</span>
            </label>
            <select
              id="equipment_id"
              name="equipment_id"
              value={formData.equipment_id}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">選択してください</option>
              {equipment.map((equip) => (
                <option key={equip.id} value={equip.id}>
                  {equip.equipment_code} - {equip.name}
                  {equip.sites && ` (現在地: ${equip.sites.name})`}
                </option>
              ))}
            </select>
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
            <div>
              <label htmlFor="to_location_id" className="block text-sm font-medium text-gray-700">
                持出先（現場） <span className="text-red-500">*</span>
              </label>
              <select
                id="to_location_id"
                name="to_location_id"
                value={formData.to_location_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="">選択してください</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                使用者: {currentUserName}
              </p>
            </div>
          )}

          {/* 返却の場合 */}
          {formData.action_type === 'checkin' && (
            <>
              <div>
                <label htmlFor="from_location_id" className="block text-sm font-medium text-gray-700">
                  返却元（現在地） <span className="text-red-500">*</span>
                </label>
                <select
                  id="from_location_id"
                  name="from_location_id"
                  value={formData.from_location_id}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* 移動の場合 */}
          {formData.action_type === 'transfer' && (
            <>
              <div>
                <label htmlFor="from_location_id" className="block text-sm font-medium text-gray-700">
                  移動元（現在地） <span className="text-red-500">*</span>
                </label>
                <select
                  id="from_location_id"
                  name="from_location_id"
                  value={formData.from_location_id}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="to_location_id" className="block text-sm font-medium text-gray-700">
                  移動先 <span className="text-red-500">*</span>
                </label>
                <select
                  id="to_location_id"
                  name="to_location_id"
                  value={formData.to_location_id}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">選択してください</option>
                  {sites
                    .filter(site => site.id !== formData.from_location_id)
                    .map((site) => (
                      <option key={site.id} value={site.id}>
                        {site.name}
                      </option>
                    ))}
                </select>
              </div>
            </>
          )}

          {/* メーター記録（オプション） */}
          {selectedEquipment?.enable_hour_meter && (
            <div>
              <label htmlFor="hour_meter_reading" className="block text-sm font-medium text-gray-700">
                アワーメーター値（時間）
              </label>
              <input
                type="number"
                step="0.1"
                id="hour_meter_reading"
                name="hour_meter_reading"
                value={formData.hour_meter_reading}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder={`現在: ${selectedEquipment.current_hour_meter || 0} 時間`}
              />
            </div>
          )}

          {/* 備考 */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              備考
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
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
