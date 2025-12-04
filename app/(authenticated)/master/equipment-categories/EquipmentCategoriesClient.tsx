'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Category {
  id: string
  organization_id: string | null
  name: string
  code_prefix: string | null
  icon: string | null
  sort_order: number
  is_active: boolean
  created_at: string
}

interface EquipmentCategoriesClientProps {
  initialCategories: Category[]
  organizationId: string
}

export function EquipmentCategoriesClient({
  initialCategories,
  organizationId,
}: EquipmentCategoriesClientProps) {
  const router = useRouter()
  const [categories, setCategories] = useState(initialCategories)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    code_prefix: '',
    icon: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleAdd = async () => {
    if (!formData.name.trim()) {
      setError('カテゴリ名を入力してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: insertError } = await supabase
        .from('heavy_equipment_categories')
        .insert({
          organization_id: organizationId,
          name: formData.name.trim(),
          code_prefix: formData.code_prefix.trim() || null,
          icon: formData.icon.trim() || null,
          sort_order: categories.length,
          is_active: true,
        })
        .select()
        .single()

      if (insertError) throw insertError

      setCategories([...categories, data])
      setFormData({ name: '', code_prefix: '', icon: '' })
      setIsAdding(false)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'カテゴリの追加に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) {
      setError('カテゴリ名を入力してください')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: updateError } = await supabase
        .from('heavy_equipment_categories')
        .update({
          name: formData.name.trim(),
          code_prefix: formData.code_prefix.trim() || null,
          icon: formData.icon.trim() || null,
        })
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      setCategories(
        categories.map((cat) => (cat.id === id ? data : cat))
      )
      setFormData({ name: '', code_prefix: '', icon: '' })
      setEditingId(null)
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'カテゴリの更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, isSystemCategory: boolean) => {
    if (isSystemCategory) {
      alert('システムカテゴリは削除できません')
      return
    }

    if (!confirm('このカテゴリを削除してもよろしいですか？')) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: deleteError } = await supabase
        .from('heavy_equipment_categories')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      setCategories(categories.filter((cat) => cat.id !== id))
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'カテゴリの削除に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const startEdit = (category: Category) => {
    if (!category.organization_id) {
      alert('システムカテゴリは編集できません')
      return
    }
    setEditingId(category.id)
    setFormData({
      name: category.name,
      code_prefix: category.code_prefix || '',
      icon: category.icon || '',
    })
    setIsAdding(false)
    setError(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setIsAdding(false)
    setFormData({ name: '', code_prefix: '', icon: '' })
    setError(null)
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 追加フォーム */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {isAdding ? (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                新しいカテゴリを追加
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    カテゴリ名 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="例: ショベルカー"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    コード接頭辞
                  </label>
                  <input
                    type="text"
                    value={formData.code_prefix}
                    onChange={(e) =>
                      setFormData({ ...formData, code_prefix: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="例: SHV"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    アイコン（絵文字）
                  </label>
                  <input
                    type="text"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="例: 🚜"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAdd}
                  disabled={loading}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {loading ? '追加中...' : '追加'}
                </button>
                <button
                  onClick={cancelEdit}
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  キャンセル
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAdding(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              + カテゴリを追加
            </button>
          )}
        </div>
      </div>

      {/* カテゴリ一覧 */}
      <div className="bg-white shadow sm:rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                カテゴリ名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                コード接頭辞
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                アイコン
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                種別
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((category) => {
              const isSystemCategory = !category.organization_id
              const isEditing = editingId === category.id

              return (
                <tr key={category.id} className={isEditing ? 'bg-blue-50' : ''}>
                  {isEditing ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.code_prefix}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              code_prefix: e.target.value,
                            })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.icon}
                          onChange={(e) =>
                            setFormData({ ...formData, icon: e.target.value })
                          }
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">編集中</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleUpdate(category.id)}
                          disabled={loading}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          保存
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          キャンセル
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {category.code_prefix || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg">{category.icon || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isSystemCategory ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            システム
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            カスタム
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        {!isSystemCategory && (
                          <>
                            <button
                              onClick={() => startEdit(category)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              編集
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(category.id, isSystemCategory)
                              }
                              className="text-red-600 hover:text-red-900"
                            >
                              削除
                            </button>
                          </>
                        )}
                        {isSystemCategory && (
                          <span className="text-gray-400 text-sm">
                            編集不可
                          </span>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>

        {categories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">
              カテゴリが登録されていません
            </p>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              カテゴリ管理について
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>
                  <strong>システムカテゴリ</strong>:
                  全組織共通のカテゴリです。編集・削除はできません。
                </li>
                <li>
                  <strong>カスタムカテゴリ</strong>:
                  組織独自のカテゴリです。自由に追加・編集・削除できます。
                </li>
                <li>
                  コード接頭辞を設定すると、重機コード生成時に自動的に使用されます。
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
