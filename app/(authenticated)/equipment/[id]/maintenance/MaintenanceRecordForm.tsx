'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MaintenanceRecordFormProps {
  equipmentId: string
  equipmentName: string
  currentUserName: string
  organizationId: string
}

export default function MaintenanceRecordForm({
  equipmentId,
  equipmentName,
  currentUserName,
  organizationId,
}: MaintenanceRecordFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState({
    maintenance_type: 'vehicle_inspection' as 'vehicle_inspection' | 'insurance_renewal' | 'repair' | 'other',
    maintenance_date: new Date().toISOString().split('T')[0],
    performed_by: currentUserName,
    cost: '',
    next_date: '',
    receipt_url: '',
    report_url: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      if (!formData.maintenance_date) {
        throw new Error('実施日は必須です')
      }

      // 点検記録を作成
      const maintenanceData = {
        organization_id: organizationId,
        equipment_id: equipmentId,
        maintenance_type: formData.maintenance_type,
        maintenance_date: formData.maintenance_date,
        performed_by: formData.performed_by || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        next_date: formData.next_date || null,
        receipt_url: formData.receipt_url || null,
        report_url: formData.report_url || null,
        notes: formData.notes || null,
      }

      const { error: insertError } = await supabase
        .from('heavy_equipment_maintenance')
        .insert(maintenanceData)

      if (insertError) {
        // エラーメッセージを日本語化
        if (insertError.code === '42501') {
          throw new Error('点検記録の登録権限がありません。管理者またはリーダー権限が必要です。')
        }
        throw new Error(insertError.message || '点検記録の登録に失敗しました')
      }

      // 車検または保険更新の場合、重機マスタの日付を更新
      if (formData.maintenance_type === 'vehicle_inspection' && formData.next_date) {
        const { error: updateError } = await supabase
          .from('heavy_equipment')
          .update({
            vehicle_inspection_date: formData.next_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', equipmentId)

        if (updateError) throw updateError
      } else if (formData.maintenance_type === 'insurance_renewal' && formData.next_date) {
        const { error: updateError } = await supabase
          .from('heavy_equipment')
          .update({
            insurance_end_date: formData.next_date,
            updated_at: new Date().toISOString(),
          })
          .eq('id', equipmentId)

        if (updateError) throw updateError
      }

      // 詳細画面へリダイレクト
      router.push(`/equipment/${equipmentId}`)
      router.refresh()
    } catch (err: any) {
      console.error('点検記録エラー:', err)
      setError(err.message || '点検記録の登録に失敗しました')
      setIsSubmitting(false)
    }
  }

  // 点検タイプラベル
  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle_inspection':
        return '車検'
      case 'insurance_renewal':
        return '保険更新'
      case 'repair':
        return '修理'
      case 'other':
        return 'その他'
      default:
        return type
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

      {/* 点検タイプ */}
      <div>
        <label htmlFor="maintenance_type" className="block text-sm font-medium text-gray-700 mb-2">
          点検タイプ <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['vehicle_inspection', 'insurance_renewal', 'repair', 'other'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFormData({ ...formData, maintenance_type: type })}
              className={`px-4 py-3 text-sm font-medium rounded-md border ${
                formData.maintenance_type === type
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {getMaintenanceTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* 実施日 */}
      <div>
        <label htmlFor="maintenance_date" className="block text-sm font-medium text-gray-700">
          実施日 <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          id="maintenance_date"
          name="maintenance_date"
          value={formData.maintenance_date}
          onChange={handleChange}
          required
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {/* 実施者 */}
      <div>
        <label htmlFor="performed_by" className="block text-sm font-medium text-gray-700">
          実施者
        </label>
        <input
          type="text"
          id="performed_by"
          name="performed_by"
          value={formData.performed_by}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="例: 株式会社○○整備工場"
        />
      </div>

      {/* 費用 */}
      <div>
        <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
          費用（円）
        </label>
        <input
          type="number"
          id="cost"
          name="cost"
          value={formData.cost}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="例: 150000"
        />
      </div>

      {/* 次回予定日 */}
      <div>
        <label htmlFor="next_date" className="block text-sm font-medium text-gray-700">
          次回予定日
          {(formData.maintenance_type === 'vehicle_inspection' || formData.maintenance_type === 'insurance_renewal') && (
            <span className="ml-2 text-xs text-gray-500">
              （入力すると重機マスタの{formData.maintenance_type === 'vehicle_inspection' ? '車検日' : '保険終了日'}が自動更新されます）
            </span>
          )}
        </label>
        <input
          type="date"
          id="next_date"
          name="next_date"
          value={formData.next_date}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        />
      </div>

      {/* 領収書URL */}
      <div>
        <label htmlFor="receipt_url" className="block text-sm font-medium text-gray-700">
          領収書URL
        </label>
        <input
          type="url"
          id="receipt_url"
          name="receipt_url"
          value={formData.receipt_url}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-gray-500">
          領収書をクラウドストレージにアップロードしている場合はURLを入力
        </p>
      </div>

      {/* 報告書URL */}
      <div>
        <label htmlFor="report_url" className="block text-sm font-medium text-gray-700">
          報告書URL
        </label>
        <input
          type="url"
          id="report_url"
          name="report_url"
          value={formData.report_url}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="https://..."
        />
        <p className="mt-1 text-xs text-gray-500">
          点検報告書をクラウドストレージにアップロードしている場合はURLを入力
        </p>
      </div>

      {/* 備考 */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
          備考
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={formData.notes}
          onChange={handleChange}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          placeholder="点検内容の詳細、交換部品、注意事項などを記入"
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
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '登録中...' : '登録する'}
        </button>
      </div>
    </form>
  )
}
