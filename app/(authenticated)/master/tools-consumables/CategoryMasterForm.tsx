'use client'

import { useState } from 'react'
import { createOrUpdateCategory } from './actions'

type Category = {
  id: string
  name: string
  description?: string | null
}

type Props = {
  organizationId: string
  editingCategory: Category | null
  onCancel: () => void
  onSuccess: () => void
}

export function CategoryMasterForm({
  organizationId,
  editingCategory,
  onCancel,
  onSuccess,
}: Props) {
  const [formData, setFormData] = useState({
    name: editingCategory?.name || '',
    description: editingCategory?.description || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await createOrUpdateCategory({
        id: editingCategory?.id,
        name: formData.name,
        description: formData.description || undefined,
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
        {/* カテゴリ名 */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            カテゴリ名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            id="name"
            required
            maxLength={50}
            value={formData.name}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 養生材、保護具、接着・固定材"
          />
        </div>

        {/* 説明 */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            説明
          </label>
          <textarea
            name="description"
            id="description"
            rows={3}
            maxLength={500}
            value={formData.description}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 養生テープ、ブルーシート、マスキングテープ等"
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
            {loading ? '処理中...' : editingCategory ? '更新' : '登録'}
          </button>
        </div>
      </form>
    </div>
  )
}
