'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface DeleteCategoryFormProps {
  categoryId: string
  usageCount: number
}

export function DeleteCategoryForm({ categoryId, usageCount }: DeleteCategoryFormProps) {
  const router = useRouter()
  const supabase = createClient()

  // UI状態
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)
    setIsSubmitting(true)

    try {
      // カテゴリを論理削除
      const { error: deleteError } = await supabase
        .from('tool_categories')
        .update({
          deleted_at: new Date().toISOString(),
        })
        .eq('id', categoryId)

      if (deleteError) {
        throw new Error(`削除に失敗しました: ${deleteError.message}`)
      }

      // このカテゴリを使用している道具のcategory_idをNULLに設定
      if (usageCount > 0) {
        const { error: updateError } = await supabase
          .from('tools')
          .update({ category_id: null })
          .eq('category_id', categoryId)

        if (updateError) {
          console.error('道具のカテゴリクリアエラー:', updateError)
          // エラーが出ても続行（カテゴリは削除済み）
        }
      }

      // 成功したらカテゴリ一覧にリダイレクト
      router.push('/categories')
      router.refresh()
    } catch (err: any) {
      console.error('削除エラー:', err)
      setError(err.message || '削除中にエラーが発生しました')
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
        <p className="text-sm text-red-800">
          この操作は取り消せません。本当に削除してもよろしいですか？
        </p>
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
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? '削除中...' : '削除'}
        </button>
      </div>
    </div>
  )
}
