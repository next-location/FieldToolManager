'use client'

// Version: 5.0 - Removed CSRF protection (SameSite=Lax is sufficient)
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface MarkReceivedButtonProps {
  orderId: string
  orderNumber: string
}

export function MarkReceivedButton({ orderId, orderNumber }: MarkReceivedButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkReceived = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`発注書「${orderNumber}」の商品・サービスを受領しましたか？`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}/mark-received`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
