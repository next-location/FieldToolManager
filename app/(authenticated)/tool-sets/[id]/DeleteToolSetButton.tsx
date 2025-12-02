'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteToolSet } from '../actions'

export function DeleteToolSetButton({
  toolSetId,
  toolSetName,
}: {
  toolSetId: string
  toolSetName: string
}) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteToolSet(toolSetId)
      router.push('/tool-sets')
    } catch (error) {
      alert('削除に失敗しました: ' + (error as Error).message)
      setIsDeleting(false)
      setShowConfirm(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
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
