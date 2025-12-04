'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

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

interface EquipmentRegistrationFormProps {
  organizationId: string
  categories: Category[]
  sites: Site[]
  organizationSettings: any
}

export function EquipmentRegistrationForm({
  organizationId,
  categories,
  sites,
  organizationSettings,
}: EquipmentRegistrationFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // フォーム状態
  const [formData, setFormData] = useState({
    equipment_code: '',
    name: '',
    category_id: '',
    manufacturer: '',
    model_number: '',
    serial_number: '',
    registration_number: '',

    // 所有形態（最重要）
    ownership_type: 'owned' as 'owned' | 'leased' | 'rented',
    supplier_company: '',
    contract_number: '',
    contract_start_date: '',
    contract_end_date: '',
    monthly_cost: '',
    purchase_date: '',
    purchase_price: '',

    // ステータス
    status: 'available',
    current_location_id: '',

    // 車検管理
    requires_vehicle_inspection: false,
    vehicle_inspection_date: '',
    vehicle_inspection_reminder_days: '60',

    // 保険管理
    insurance_company: '',
    insurance_policy_number: '',
    insurance_start_date: '',
    insurance_end_date: '',
    insurance_reminder_days: '60',

    // メーター管理（オプション）
    enable_hour_meter: organizationSettings?.enable_hour_meter || false,
    current_hour_meter: '',

    // その他
    notes: '',
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

      // QRコード生成（UUID）
      const qrCode = crypto.randomUUID()

      // 登録データ準備
      const equipmentData = {
        organization_id: organizationId,
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

        qr_code: qrCode,
        notes: formData.notes || null,
      }

      const { data, error: insertError } = await supabase
        .from('heavy_equipment')
        .insert(equipmentData)
        .select()
        .single()

      if (insertError) throw insertError

      // 成功したら一覧ページへ
      router.push('/equipment')
      router.refresh()
    } catch (err: any) {
      console.error('重機登録エラー:', err)
      setError(err.message || '重機の登録に失敗しました')
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
      <div className="space-y-6">
        <h3 className="text-base font-medium text-gray-900">基本情報</h3>

        <div>
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: BH-001"
          />
        </div>

        <div>
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: コマツ PC200-10"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
              カテゴリ
            </label>
            <select
              id="category_id"
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
            <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
              メーカー
            </label>
            <input
              type="text"
              id="manufacturer"
              name="manufacturer"
              value={formData.manufacturer}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: コマツ"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: PC200-10"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="例: 建 12-34"
            />
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

      {/* 所有形態（最重要） */}
      <div className="border-t border-gray-200 pt-6 space-y-6">
        <div>
          <h3 className="text-base font-medium text-gray-900">
            所有形態 <span className="text-red-500">*</span>
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            重機の所有形態を選択してください。コスト管理に重要な情報です。
          </p>
        </div>

        <div>
          <label htmlFor="ownership_type" className="block text-sm font-medium text-gray-700">
            所有形態 <span className="text-red-500">*</span>
          </label>
          <select
            id="ownership_type"
            name="ownership_type"
            value={formData.ownership_type}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="owned">自社所有（購入）</option>
            <option value="leased">リース</option>
            <option value="rented">レンタル</option>
          </select>
        </div>

        {/* 自社所有の場合 */}
        {formData.ownership_type === 'owned' && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: 15000000"
              />
            </div>
          </div>
        )}

        {/* リース・レンタルの場合 */}
        {(formData.ownership_type === 'leased' || formData.ownership_type === 'rented') && (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="例: ○○リース株式会社"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: 250000"
              />
            </div>
          </>
        )}
      </div>

      {/* 車検管理（必須） */}
      <div className="border-t border-gray-200 pt-6 space-y-6">
        <div>
          <h3 className="text-base font-medium text-gray-900">車検管理</h3>
          <p className="mt-1 text-xs text-gray-500">
            車検が必要な重機の場合は設定してください。期限が近づくとアラート通知されます。
          </p>
        </div>

        <div className="flex items-start">
          <div className="flex items-center h-5">
            <input
              type="checkbox"
              name="requires_vehicle_inspection"
              checked={formData.requires_vehicle_inspection}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <label className="font-medium text-gray-700">
              この重機は車検が必要です
            </label>
          </div>
        </div>

        {formData.requires_vehicle_inspection && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="60"
              />
            </div>
          </div>
        )}
      </div>

      {/* 保険管理（必須） */}
      <div className="border-t border-gray-200 pt-6 space-y-6">
        <div>
          <h3 className="text-base font-medium text-gray-900">保険管理</h3>
          <p className="mt-1 text-xs text-gray-500">
            重機の保険情報を入力してください。期限が近づくとアラート通知されます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="60"
          />
        </div>
      </div>

      {/* メーター管理（オプション） */}
      {organizationSettings?.enable_hour_meter && (
        <div className="border-t border-gray-200 pt-6 space-y-6">
          <div>
            <h3 className="text-base font-medium text-gray-900">メーター管理（オプション）</h3>
            <p className="mt-1 text-xs text-gray-500">
              アワーメーター（稼働時間）を管理する場合はチェックしてください。
            </p>
          </div>

          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                name="enable_hour_meter"
                checked={formData.enable_hour_meter}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </div>
            <div className="ml-3 text-sm">
              <label className="font-medium text-gray-700">
                アワーメーターを管理する
              </label>
            </div>
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
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="例: 1234.5"
              />
            </div>
          )}
        </div>
      )}

      {/* 備考 */}
      <div className="border-t border-gray-200 pt-6 space-y-6">
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
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="その他特記事項があれば入力してください"
          />
        </div>
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.push('/equipment')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '登録中...' : '登録'}
        </button>
      </div>
    </form>
  )
}
