'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SendInvoiceButtonProps {
  invoiceId: string
  status: string
  isApproved: boolean
  userRole: string
  userId?: string
  createdById?: string
}

export function SendInvoiceButton({
  invoiceId,
  status,
  isApproved,
  userRole,
  userId,
  createdById
}: SendInvoiceButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // manager以上、または作成者本人（リーダー）のみ表示
  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)
  const isCreator = userId && createdById && userId === createdById

  if (!isManagerOrAdmin && !isCreator) {
    return null
  }

  // approved のみ送付可能
  if (status !== 'approved') {
    return null
  }

  const handleSend = async () => {
    if (!confirm('請求書を顧客に送付しましたか？\n\nこのボタンは、実際に顧客へ請求書を送付した後に、ステータスを「送付済」に変更するためのものです。\n\n※このボタンを押してもメール送信等は行われません。')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'ステータス変更に失敗しました')
      }

      alert('ステータスを「送付済」に変更しました')
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
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
    >
      {isLoading ? '変更中...' : '送付済みにする'}
    </button>
  )
}
