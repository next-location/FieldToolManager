'use client'

import { useState } from 'react'
import { createOrUpdateToolMaster } from './actions'
import { ImageUpload } from '@/components/ImageUpload'

type Category = {
  id: string
  name: string
}

type Manufacturer = {
  id: string
  name: string
  country?: string
}

type Master = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  unit: string
  minimum_stock: number
  image_url: string | null
  notes: string | null
  tool_categories: {
    id: string
    name: string
  } | null
}

type Props = {
  categories: Category[]
  manufacturers: Manufacturer[]
  organizationId: string
  editingMaster: Master | null
  onCancel: () => void
  onSuccess: () => void
}

export function ToolMasterForm({
  categories,
  manufacturers,
  organizationId,
  editingMaster,
  onCancel,
  onSuccess,
}: Props) {
  const [formData, setFormData] = useState({
    name: editingMaster?.name || '',
    model_number: editingMaster?.model_number || '',
    manufacturer: editingMaster?.manufacturer || '',
    category_id: editingMaster?.tool_categories?.id || '',
    unit: editingMaster?.unit || '個',
    minimum_stock: editingMaster?.minimum_stock?.toString() || '1',
    notes: editingMaster?.notes || '',
  })
  const [imageUrl, setImageUrl] = useState<string | null>(editingMaster?.image_url || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createOrUpdateToolMaster({
        id: editingMaster?.id,
        name: formData.name,
        model_number: formData.model_number || undefined,
        manufacturer: formData.manufacturer || undefined,
        category_id: formData.category_id || undefined,
        unit: formData.unit,
        minimum_stock: parseInt(formData.minimum_stock, 10),
        image_url: imageUrl || undefined,
        notes: formData.notes || undefined,
        organization_id: organizationId,
      })

      if (result.error) {
        setError(result.error)
      } else {
        onSuccess()
      }
    } catch (err: any) {
      setError(err.message || '処理に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 道具名 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            道具名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            maxLength={100}
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* メーカー */}
        <div>
          <label htmlFor="manufacturer" className="block text-sm font-medium text-gray-700">
            メーカー
          </label>
          <input
            type="text"
            name="manufacturer"
            id="manufacturer"
            list="manufacturers-list"
            maxLength={50}
            value={formData.manufacturer}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="メーカー名を入力または選択..."
          />
          <datalist id="manufacturers-list">
            {manufacturers.map((mfr) => (
              <option key={mfr.id} value={mfr.name}>
                {mfr.country && `(${mfr.country})`}
              </option>
            ))}
          </datalist>
          <p className="mt-1 text-xs text-gray-500">
            候補から選択するか、新しいメーカー名を入力できます
          </p>
        </div>

        {/* 型番 */}
        <div>
          <label htmlFor="model_number" className="block text-sm font-medium text-gray-700">
            型番
          </label>
          <input
            type="text"
            name="model_number"
            id="model_number"
            maxLength={50}
            value={formData.model_number}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* カテゴリ */}
        <div>
          <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
            カテゴリ
          </label>
          <select
            name="category_id"
            id="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">カテゴリを選択...</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 単位・最小在庫数 */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
              単位 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="unit"
              id="unit"
              required
              maxLength={20}
              value={formData.unit}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="個、台、本など"
            />
          </div>

          <div>
            <label htmlFor="minimum_stock" className="block text-sm font-medium text-gray-700">
              最小在庫数 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="minimum_stock"
              id="minimum_stock"
              required
              min="1"
              value={formData.minimum_stock}
              onChange={handleChange}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* 画像 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">道具の画像</label>
          <ImageUpload
            organizationId={organizationId}
            onImageUploaded={setImageUrl}
            onImageRemoved={() => setImageUrl(null)}
            currentImageUrl={imageUrl}
          />
        </div>

        {/* 備考 */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            備考
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={3}
            maxLength={2000}
            value={formData.notes}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '処理中...' : editingMaster ? '更新' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}
