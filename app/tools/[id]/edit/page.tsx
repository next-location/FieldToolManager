'use client'

import { use, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { updateTool } from '../../actions'

export default function EditToolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [formData, setFormData] = useState({
    name: '',
    model_number: '',
    manufacturer: '',
    purchase_date: '',
    purchase_price: '',
    quantity: '1',
    minimum_stock: '1',
    notes: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadTool() {
      const { data: tool, error } = await supabase
        .from('tools')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !tool) {
        router.push('/tools')
        return
      }

      setFormData({
        name: tool.name,
        model_number: tool.model_number || '',
        manufacturer: tool.manufacturer || '',
        purchase_date: tool.purchase_date || '',
        purchase_price: tool.purchase_price?.toString() || '',
        quantity: tool.quantity.toString(),
        minimum_stock: tool.minimum_stock.toString(),
        notes: tool.notes || '',
      })
      setLoading(false)
    }

    loadTool()
  }, [id, router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const result = await updateTool(id, formData)

      if (result.error) {
        setError(result.error)
      } else {
        router.push(`/tools/${id}`)
      }
    } catch (error: any) {
      setError(error.message || '更新に失敗しました')
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </Link>
              <Link
                href="/tools"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                道具管理
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href={`/tools/${id}`}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← 道具詳細に戻る
            </Link>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-6">
                道具の編集
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
                    道具名 <span className="text-red-500">*</span>
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
                      htmlFor="purchase_date"
                      className="block text-sm font-medium text-gray-700"
                    >
                      購入日
                    </label>
                    <input
                      type="date"
                      name="purchase_date"
                      id="purchase_date"
                      value={formData.purchase_date}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="purchase_price"
                      className="block text-sm font-medium text-gray-700"
                    >
                      購入価格（円）
                    </label>
                    <input
                      type="number"
                      name="purchase_price"
                      id="purchase_price"
                      min="0"
                      step="0.01"
                      value={formData.purchase_price}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="quantity"
                      className="block text-sm font-medium text-gray-700"
                    >
                      数量 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      id="quantity"
                      min="1"
                      required
                      value={formData.quantity}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="minimum_stock"
                      className="block text-sm font-medium text-gray-700"
                    >
                      最小在庫数
                    </label>
                    <input
                      type="number"
                      name="minimum_stock"
                      id="minimum_stock"
                      min="1"
                      value={formData.minimum_stock}
                      onChange={handleChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
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
                    href={`/tools/${id}`}
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
      </main>
    </div>
  )
}
