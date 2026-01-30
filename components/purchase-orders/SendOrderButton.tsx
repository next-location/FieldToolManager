'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCsrfToken } from '@/hooks/useCsrfToken'

interface SendOrderButtonProps {
  orderId: string
  orderNumber: string
}

export function SendOrderButton({ orderId, orderNumber }: SendOrderButtonProps) {
  const { token: csrfToken } = useCsrfToken()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSend = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!csrfToken || csrfToken === '') {
      alert('セキュリティトークンが読み込まれていません。ページを再読み込みしてください。')
      return
    }

    if (!confirm(`発注書「${orderNumber}」を仕入先に送付しますか？`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '送付に失敗しました')
      }

      alert('仕入先に発注書を送付しました')
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
      {loading ? '送付中...' : '仕入先送付'}
    </button>
  )
}
