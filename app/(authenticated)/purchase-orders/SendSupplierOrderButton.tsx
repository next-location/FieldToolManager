'use client'

// Version: 5.0 - Removed CSRF protection (SameSite=Lax is sufficient)
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SendOrderButtonProps {
  orderId: string
  orderNumber: string
}

export function SendSupplierOrderButton({ orderId, orderNumber }: SendOrderButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSend = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!confirm(`発注書「${orderNumber}」を発注先に送付しますか？`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '送付に失敗しました')
      }

      alert('発注先に発注書を送付しました')
      router.refresh()
    } catch (error) {
      console.error('Error sending order:', error)
      alert(error instanceof Error ? error.message : '送付に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={loading}
      className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
    >
      {loading ? '送付中...' : '発注先送付'}
    </button>
  )
}
