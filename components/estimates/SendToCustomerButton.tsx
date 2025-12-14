'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SendToCustomerButtonProps {
  estimateId: string
  status: string
  isApproved: boolean
  userRole: string
}

export function SendToCustomerButton({
  estimateId,
  status,
  isApproved,
  userRole
}: SendToCustomerButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // manager以上のみ表示
  if (!['manager', 'admin', 'super_admin'].includes(userRole)) {
    return null
  }

  // submitted かつ承認済みのみ送付可能
  if (status !== 'submitted' || !isApproved) {
    return null
  }

  const handleSend = async () => {
    if (!confirm('この見積書を顧客に送付してもよろしいですか？\n送付後はステータスが「顧客送付済」に変更されます。')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/estimates/${estimateId}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '送付に失敗しました')
      }

      alert('見積書を顧客に送付しました')
      router.refresh()
    } catch (error) {
      console.error('送付エラー:', error)
      alert(error instanceof Error ? error.message : '見積書の送付に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isLoading ? '送付中...' : '顧客に送付'}
    </button>
  )
}
