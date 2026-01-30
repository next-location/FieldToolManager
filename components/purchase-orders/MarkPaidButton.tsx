'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useCsrfToken } from '@/hooks/useCsrfToken'

interface MarkPaidButtonProps {
  orderId: string
  orderNumber: string
}

export function MarkPaidButton({ orderId, orderNumber }: MarkPaidButtonProps) {
  const { token: csrfToken, loading: tokenLoading } = useCsrfToken()
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkPaid = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!csrfToken) {
      alert('セキュリティトークンが読み込まれていません。ページを再読み込みしてください。')
      return
    }

    if (!confirm(`発注書「${orderNumber}」の支払を完了しましたか？`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/purchase-orders/${orderId}/mark-paid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '支払登録に失敗しました')
      }

      alert('支払登録しました')
      // 入出金管理ページにリダイレクト
      router.push('/payments')
    } catch (error) {
      console.error('Error marking as paid:', error)
      alert(error instanceof Error ? error.message : '支払登録に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleMarkPaid}
      disabled={loading || tokenLoading || !csrfToken}
      className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition-colors disabled:opacity-50"
    >
      {loading ? '登録中...' : '支払登録'}
    </button>
  )
}
