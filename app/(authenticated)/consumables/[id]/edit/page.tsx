'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function EditConsumablePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [formData, setFormData] = useState({
    name: '',
    model_number: '',
    manufacturer: '',
    unit: '個',
    minimum_stock: '10',
    notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadConsumable() {
      // ユーザー情報を取得
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // 消耗品情報を取得
      const { data: consumable, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .eq('management_type', 'consumable')
        .single()

      if (error || !consumable) {
        router.push('/consumables')
        return
      }

      setFormData({
        name: consumable.name,
        model_number: consumable.model_number || '',
        manufacturer: consumable.manufacturer || '',
        unit: consumable.unit || '個',
        minimum_stock: consumable.minimum_stock?.toString() || '10',
        notes: consumable.notes || '',
      })
      setLoading(false)
    }

    loadConsumable()
  }, [id, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const { error: updateError } = await supabase
        .from('tools')
        .update({
          name: formData.name,
          model_number: formData.model_number || null,
          manufacturer: formData.manufacturer || null,
          unit: formData.unit,
          minimum_stock: parseInt(formData.minimum_stock) || 10,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateError) {
        throw updateError
      }

      router.push(`/consumables/${id}`)
      router.refresh()
    } catch (error: any) {
      setError(error.message || '更新に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href={`/consumables/${id}`}
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 消耗品詳細に戻る
          </Link>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              消耗品の編集
            </h2>

            {error && (
              <div className="rounded-md bg-red-50 p-4 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700"
                >
                  消耗品名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="model_number"
                    className="block text-sm font-medium text-gray-700"
                  >
                    型番
                  </label>
                  <input
                    type="text"
                    name="model_number"
                    id="model_number"
                    value={formData.model_number}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="manufacturer"
                    className="block text-sm font-medium text-gray-700"
                  >
                    メーカー
                  </label>
                  <input
                    type="text"
                    name="manufacturer"
                    id="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="unit"
                    className="block text-sm font-medium text-gray-700"
                  >
                    単位 <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="unit"
                    id="unit"
                    required
                    value={formData.unit}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="個">個</option>
                    <option value="本">本</option>
                    <option value="枚">枚</option>
                    <option value="箱">箱</option>
                    <option value="袋">袋</option>
                    <option value="巻">巻</option>
                    <option value="セット">セット</option>
                    <option value="ケース">ケース</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="minimum_stock"
                    className="block text-sm font-medium text-gray-700"
                  >
                    最小在庫数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="minimum_stock"
                    id="minimum_stock"
                    min="0"
                    required
                    value={formData.minimum_stock}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    在庫がこの数を下回ると「在庫不足」として警告されます
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700"
                >
                  備考
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Link
                  href={`/consumables/${id}`}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  キャンセル
                </Link>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
