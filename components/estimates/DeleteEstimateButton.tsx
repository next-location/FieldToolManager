'use client'

import { useRouter } from 'next/navigation'

interface DeleteEstimateButtonProps {
  estimateId: string
  estimateNumber: string
}

export function DeleteEstimateButton({
  estimateId,
  estimateNumber
}: DeleteEstimateButtonProps) {
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm(`見積書「${estimateNumber}」を削除してもよろしいですか？\nこの操作は取り消せません。`)) {
      return
    }

    try {
      const response = await fetch(`/api/estimates/${estimateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '削除に失敗しました')
      }

      alert('見積書を削除しました')
      router.push('/estimates')
      router.refresh()
    } catch (error) {
      console.error('削除エラー:', error)
      alert(error instanceof Error ? error.message : '見積書の削除に失敗しました')
    }
  }

  return (
    <button
      onClick={handleDelete}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
    >
      削除
    </button>
  )
}
