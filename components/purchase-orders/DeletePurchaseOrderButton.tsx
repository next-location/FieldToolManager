'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCsrfToken } from '@/hooks/useCsrfToken'

interface DeletePurchaseOrderButtonProps {
  orderId: string
  orderNumber: string
  redirectToList?: boolean
}

export function DeletePurchaseOrderButton({
  orderId,
  orderNumber,
  redirectToList = false,
}: DeletePurchaseOrderButtonProps) {
  const { token: csrfToken } = useCsrfToken()
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!csrfToken || csrfToken === '') {
      alert('セキュリティトークンが読み込まれていません。ページを再読み込みしてください。')
      return
    }

    if (!confirm(`発注書「${orderNumber}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch(`/api/purchase-orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '削除に失敗しました')
      }

      alert('発注書を削除しました')
      // キャッシュをクリアして一覧ページに遷移
      router.push('/purchase-orders')
      router.refresh()
    } catch (error) {
      console.error('Error deleting purchase order:', error)
      alert(error instanceof Error ? error.message : '削除に失敗しました')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors disabled:opacity-50"
    >
      {isDeleting ? '削除中...' : '削除'}
    </button>
  )
}
