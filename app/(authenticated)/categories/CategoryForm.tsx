'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CategoryFormProps {
  organizationId: string
  initialData?: {
    id: string
    name: string
    description: string | null
  }
}

export function CategoryForm({ organizationId, initialData }: CategoryFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // フォーム状態
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // バリデーション
    if (!name.trim()) {
      setError('カテゴリ名を入力してください')
      return
    }

    setIsSubmitting(true)

    try {
      if (initialData) {
        // 更新
        const { error: updateError } = await supabase
          .from('tool_categories')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', initialData.id)

        if (updateError) {
          throw new Error(`更新に失敗しました: ${updateError.message}`)
        }
      } else {
        // 新規登録
        const { error: insertError } = await supabase
          .from('tool_categories')
          .insert({
            organization_id: organizationId,
            name: name.trim(),
            description: description.trim() || null,
          })

        if (insertError) {
          throw new Error(`登録に失敗しました: ${insertError.message}`)
        }
      }

      // 成功したらカテゴリ一覧にリダイレクト
      router.push('/categories')
      router.refresh()
    } catch (err: any) {
      console.error('エラー:', err)
      setError(err.message || '処理中にエラーが発生しました')
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* カテゴリ名 */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          カテゴリ名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          required
          disabled={isSubmitting}
          placeholder="例: 養生材、保護具、接着・固定材"
        />
      </div>

      {/* 説明 */}
      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-gray-700"
        >
          説明
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={isSubmitting}
          placeholder="例: 養生テープ、ブルーシート、マスキングテープ等"
        />
      </div>

      {/* ボタン */}
      <div className="flex justify-end space-x-3">
        <a
          href="/categories"
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </a>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '処理中...' : initialData ? '更新' : '登録'}
        </button>
      </div>
    </form>
  )
}
