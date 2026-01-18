'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function DeleteConsumableButton({
  consumableId,
  consumableName,
}: {
  consumableId: string
  consumableName: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    setIsDeleting(true)

    try {
      // 論理削除（deleted_atを設定）
      const { error } = await supabase
        .from('tools')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', consumableId)

      if (error) {
        throw error
      }

      router.push('/consumables')
      router.refresh()
    } catch (error: any) {
      alert('削除に失敗しました: ' + error.message)
      setIsDeleting(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
      >
        削除
      </button>
    )
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-700">本当に削除しますか？</span>
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="px-3 py-1 border border-red-300 rounded text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
      >
        {isDeleting ? '削除中...' : '削除する'}
      </button>
      <button
        onClick={() => setShowConfirm(false)}
        disabled={isDeleting}
        className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
      >
        キャンセル
      </button>
    </div>
  )
}
