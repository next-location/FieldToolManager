'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { HeavyEquipment } from '@/types/heavy-equipment'
import { updateEquipment } from '../../actions'

interface Category {
  id: string
  name: string
  code_prefix: string
  icon: string
}

interface Site {
  id: string
  name: string
}

interface EquipmentEditFormProps {
  equipment: HeavyEquipment
  categories: Category[]
  sites: Site[]
  organizationSettings: any
}

export function EquipmentEditForm({
  equipment,
  categories,
  sites,
  organizationSettings,
}: EquipmentEditFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // フォーム状態（既存データで初期化）
  const [formData, setFormData] = useState({
    equipment_code: equipment.equipment_code,
    name: equipment.name,
    category_id: equipment.category_id || '',
    manufacturer: equipment.manufacturer || '',
    model_number: equipment.model_number || '',
    serial_number: equipment.serial_number || '',
    registration_number: equipment.registration_number || '',

    // 所有形態
    ownership_type: equipment.ownership_type as 'owned' | 'leased' | 'rented',
    supplier_company: equipment.supplier_company || '',
    contract_number: equipment.contract_number || '',
    contract_start_date: equipment.contract_start_date || '',
    contract_end_date: equipment.contract_end_date || '',
    monthly_cost: equipment.monthly_cost?.toString() || '',
    purchase_date: equipment.purchase_date || '',
    purchase_price: equipment.purchase_price?.toString() || '',

    // ステータス
    status: equipment.status,
    current_location_id: equipment.current_location_id || '',
    default_location_id: (equipment as any).default_location_id || '',

    // 車検管理
    requires_vehicle_inspection: equipment.requires_vehicle_inspection,
    vehicle_inspection_date: equipment.vehicle_inspection_date || '',
    vehicle_inspection_reminder_days: equipment.vehicle_inspection_reminder_days?.toString() || '60',

    // 保険管理
    insurance_company: equipment.insurance_company || '',
    insurance_policy_number: equipment.insurance_policy_number || '',
    insurance_start_date: equipment.insurance_start_date || '',
    insurance_end_date: equipment.insurance_end_date || '',
    insurance_reminder_days: equipment.insurance_reminder_days?.toString() || '60',

    // メーター管理
    enable_hour_meter: equipment.enable_hour_meter,
    current_hour_meter: equipment.current_hour_meter?.toString() || '',

    // その他
    notes: equipment.notes || '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // バリデーション
      if (!formData.equipment_code || !formData.name) {
        throw new Error('重機コードと重機名は必須です')
      }

      // 更新データ準備
      const equipmentData = {
        equipment_code: formData.equipment_code,
        name: formData.name,
        category_id: formData.category_id || null,
        manufacturer: formData.manufacturer || null,
        model_number: formData.model_number || null,
        serial_number: formData.serial_number || null,
        registration_number: formData.registration_number || null,

        ownership_type: formData.ownership_type,
        supplier_company: formData.supplier_company || null,
        contract_number: formData.contract_number || null,
        contract_start_date: formData.contract_start_date || null,
        contract_end_date: formData.contract_end_date || null,
        monthly_cost: formData.monthly_cost ? parseFloat(formData.monthly_cost) : null,
        purchase_date: formData.purchase_date || null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,

        status: formData.status,
        current_location_id: formData.current_location_id || null,
        default_location_id: formData.default_location_id || null,

        requires_vehicle_inspection: formData.requires_vehicle_inspection,
        vehicle_inspection_date: formData.vehicle_inspection_date || null,
        vehicle_inspection_reminder_days: parseInt(formData.vehicle_inspection_reminder_days),

        insurance_company: formData.insurance_company || null,
        insurance_policy_number: formData.insurance_policy_number || null,
        insurance_start_date: formData.insurance_start_date || null,
        insurance_end_date: formData.insurance_end_date || null,
        insurance_reminder_days: parseInt(formData.insurance_reminder_days),

        enable_hour_meter: formData.enable_hour_meter,
        current_hour_meter: formData.current_hour_meter ? parseFloat(formData.current_hour_meter) : null,

        notes: formData.notes || null,
      }

      // サーバーアクションを使用して重機を更新（監査ログ付き）
      const result = await updateEquipment(equipment.id, equipmentData)

      if (!result.success) {
        throw new Error(result.error)
      }

      // 成功したら詳細ページへ
      router.push(`/equipment/${equipment.id}`)
      router.refresh()
    } catch (err: any) {
      console.error('重機更新エラー:', err)
      setError(err.message || '重機の更新に失敗しました')
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

      {/* 基本情報 */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">基本情報</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="equipment_code" className="block text-sm font-medium text-gray-700">
              重機コード <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="equipment_code"
              name="equipment_code"
              value={formData.equipment_code}
              onChange={handleChange}
              required
              maxLength={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              重機名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength={100}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
              カテゴリ
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">未選択</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              ステータス
            </label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="available">利用可能</option>
              <option value="in_use">使用中</option>
              <option value="maintenance">点検中</option>
              <option value="out_of_service">使用不可</option>
            </select>
          </div>

          <div>
            <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
              メーカー
            </label>
            <input
              type="text"
              id="manufacturer"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              maxLength={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="model_number" className="block text-sm font-medium text-gray-700">
              型番
            </label>
            <input
              type="text"
              id="model_number"
              name="model_number"
              value={formData.model_number}
              onChange={handleChange}
              maxLength={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">
              シリアル番号
            </label>
            <input
              type="text"
              id="serial_number"
              name="serial_number"
              value={formData.serial_number}
              onChange={handleChange}
              maxLength={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="registration_number" className="block text-sm font-medium text-gray-700">
              登録番号（ナンバープレート）
            </label>
            <input
              type="text"
              id="registration_number"
              name="registration_number"
              value={formData.registration_number}
              onChange={handleChange}
              maxLength={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="default_location_id" className="block text-sm font-medium text-gray-700">
              デフォルト保管場所 <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              返却時に自動的にこの場所に戻ります
            </p>
            <select
              id="default_location_id"
              name="default_location_id"
              value={formData.default_location_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              required
            >
              <option value="">選択してください</option>
              {sites.filter((site: any) => site.is_own_location).length > 0 ? (
                sites.filter((site: any) => site.is_own_location).map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                  </option>
                ))
              ) : (
                <option value="" disabled>自社拠点が登録されていません</option>
              )}
            </select>
          </div>

          <div>
            <label htmlFor="current_location_id" className="block text-sm font-medium text-gray-700">
              現在地
            </label>
            <select
              id="current_location_id"
              name="current_location_id"
              value={formData.current_location_id}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="">未選択</option>
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 所有形態 */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">所有形態</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label htmlFor="ownership_type" className="block text-sm font-medium text-gray-700">
              所有形態 <span className="text-red-500">*</span>
            </label>
            <select
              id="ownership_type"
              name="ownership_type"
              value={formData.ownership_type}
              onChange={handleChange}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm font-medium"
            >
              <option value="owned">自社所有（購入）</option>
              <option value="leased">リース</option>
              <option value="rented">レンタル</option>
            </select>
          </div>

          {formData.ownership_type === 'owned' && (
            <>
              <div>
                <label htmlFor="purchase_date" className="block text-sm font-medium text-gray-700">
                  購入日
                </label>
                <input
                  type="date"
                  id="purchase_date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="purchase_price" className="block text-sm font-medium text-gray-700">
                  購入価格（円）
                </label>
                <input
                  type="number"
                  id="purchase_price"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}

          {(formData.ownership_type === 'leased' || formData.ownership_type === 'rented') && (
            <>
              <div>
                <label htmlFor="supplier_company" className="block text-sm font-medium text-gray-700">
                  リース・レンタル会社
                </label>
                <input
                  type="text"
                  id="supplier_company"
                  name="supplier_company"
                  value={formData.supplier_company}
                  onChange={handleChange}
                  maxLength={100}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="contract_number" className="block text-sm font-medium text-gray-700">
                  契約番号
                </label>
                <input
                  type="text"
                  id="contract_number"
                  name="contract_number"
                  value={formData.contract_number}
                  onChange={handleChange}
                  maxLength={50}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="contract_start_date" className="block text-sm font-medium text-gray-700">
                  契約開始日
                </label>
                <input
                  type="date"
                  id="contract_start_date"
                  name="contract_start_date"
                  value={formData.contract_start_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="contract_end_date" className="block text-sm font-medium text-gray-700">
                  契約終了日
                </label>
                <input
                  type="date"
                  id="contract_end_date"
                  name="contract_end_date"
                  value={formData.contract_end_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="monthly_cost" className="block text-sm font-medium text-gray-700">
                  月額費用（円）
                </label>
                <input
                  type="number"
                  id="monthly_cost"
                  name="monthly_cost"
                  value={formData.monthly_cost}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 車検管理 */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">車検管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="requires_vehicle_inspection"
                checked={formData.requires_vehicle_inspection}
                onChange={handleChange}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">この重機は車検が必要です</span>
            </label>
          </div>

          {formData.requires_vehicle_inspection && (
            <>
              <div>
                <label htmlFor="vehicle_inspection_date" className="block text-sm font-medium text-gray-700">
                  次回車検日
                </label>
                <input
                  type="date"
                  id="vehicle_inspection_date"
                  name="vehicle_inspection_date"
                  value={formData.vehicle_inspection_date}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="vehicle_inspection_reminder_days" className="block text-sm font-medium text-gray-700">
                  アラート通知（何日前）
                </label>
                <input
                  type="number"
                  id="vehicle_inspection_reminder_days"
                  name="vehicle_inspection_reminder_days"
                  value={formData.vehicle_inspection_reminder_days}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 保険管理 */}
      <div className="border-b border-gray-200 pb-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">保険管理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="insurance_company" className="block text-sm font-medium text-gray-700">
              保険会社
            </label>
            <input
              type="text"
              id="insurance_company"
              name="insurance_company"
              value={formData.insurance_company}
              onChange={handleChange}
              maxLength={100}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="insurance_policy_number" className="block text-sm font-medium text-gray-700">
              保険証券番号
            </label>
            <input
              type="text"
              id="insurance_policy_number"
              name="insurance_policy_number"
              value={formData.insurance_policy_number}
              onChange={handleChange}
              maxLength={50}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="insurance_start_date" className="block text-sm font-medium text-gray-700">
              保険開始日
            </label>
            <input
              type="date"
              id="insurance_start_date"
              name="insurance_start_date"
              value={formData.insurance_start_date}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="insurance_end_date" className="block text-sm font-medium text-gray-700">
              保険終了日
            </label>
            <input
              type="date"
              id="insurance_end_date"
              name="insurance_end_date"
              value={formData.insurance_end_date}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="insurance_reminder_days" className="block text-sm font-medium text-gray-700">
              アラート通知（何日前）
            </label>
            <input
              type="number"
              id="insurance_reminder_days"
              name="insurance_reminder_days"
              value={formData.insurance_reminder_days}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* メーター管理 */}
      {organizationSettings?.enable_hour_meter && (
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">メーター管理（オプション）</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="enable_hour_meter"
                  checked={formData.enable_hour_meter}
                  onChange={handleChange}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">アワーメーターを管理する</span>
              </label>
            </div>

            {formData.enable_hour_meter && (
              <div>
                <label htmlFor="current_hour_meter" className="block text-sm font-medium text-gray-700">
                  現在のメーター値（時間）
                </label>
                <input
                  type="number"
                  step="0.1"
                  id="current_hour_meter"
                  name="current_hour_meter"
                  value={formData.current_hour_meter}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>
            )}
          </div>
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
          maxLength={2000}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '更新中...' : '更新する'}
        </button>
      </div>
    </form>
  )
}
