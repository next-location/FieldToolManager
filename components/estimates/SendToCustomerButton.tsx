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
    if (!confirm('見積書を顧客に送付しましたか？\n\nこのボタンは、実際に顧客へ見積書を送付した後に、ステータスを「顧客送付済」に変更するためのものです。\n\n※このボタンを押してもメール送信等は行われません。')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/estimates/${estimateId}/send`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'ステータス変更に失敗しました')
      }

      alert('ステータスを「顧客送付済」に変更しました')
      router.refresh()
    } catch (error) {
      console.error('ステータス変更エラー:', error)
      alert(error instanceof Error ? error.message : 'ステータス変更に失敗しました')
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
      {isLoading ? '変更中...' : '送付済みにする'}
    </button>
  )
}
