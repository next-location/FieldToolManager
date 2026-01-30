'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCsrfToken } from '@/hooks/useCsrfToken'
import { fetchWithReload } from '@/lib/fetch-with-reload'

interface MarkReceivedButtonProps {
  orderId: string
  orderNumber: string
}

export function MarkReceivedButton({ orderId, orderNumber }: MarkReceivedButtonProps) {
  const { token: csrfToken } = useCsrfToken()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkReceived = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!csrfToken || csrfToken === '') {
      alert('セキュリティトークンが読み込まれていません。ページを再読み込みしてください。')
      return
    }

    if (!confirm(`発注書「${orderNumber}」の商品・サービスを受領しましたか？`)) return

    setLoading(true)
    try {
      const response = await fetchWithReload(`/api/purchase-orders/${orderId}/mark-received`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '受領登録に失敗しました')
      }

      alert('受領登録しました')
      router.refresh()
    } catch (error) {
      console.error('Error marking as received:', error)
      alert(error instanceof Error ? error.message : '受領登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkReceived}
      disabled={loading}
      className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50"
    >
      {loading ? '登録中...' : '受領登録'}
    </button>
  )
}
