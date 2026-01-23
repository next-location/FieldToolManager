'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface CustomerDecisionButtonsProps {
  estimateId: string
  status: string
  userRole: string
  userId?: string
  createdBy?: string
}

export function CustomerDecisionButtons({
  estimateId,
  status,
  userRole,
  userId,
  createdBy
}: CustomerDecisionButtonsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // manager以上 または 作成者本人（leader）のみ表示
  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)
  const isCreator = userId && createdBy && userId === createdBy

  if (!isManagerOrAdmin && !isCreator) {
    return null
  }

  // sent ステータスのみ表示
  if (status !== 'sent') {
    return null
  }

  const handleApprove = async () => {
    if (!confirm('顧客が見積書を承認したことを記録しますか？')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/estimates/${estimateId}/customer-approve`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '承認の記録に失敗しました')
      }

      alert('顧客承認を記録しました')
      router.refresh()
    } catch (error) {
      console.error('承認記録エラー:', error)
      alert(error instanceof Error ? error.message : '顧客承認の記録に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm('顧客が見積書を却下したことを記録しますか？')) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/estimates/${estimateId}/customer-reject`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '却下の記録に失敗しました')
      }

      alert('顧客却下を記録しました')
      router.refresh()
    } catch (error) {
      console.error('却下記録エラー:', error)
      alert(error instanceof Error ? error.message : '顧客却下の記録に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={isLoading}
        className="px-4 py-2 text-white rounded-md disabled:bg-gray-400 disabled:cursor-not-allowed"
        style={{ backgroundColor: isLoading ? undefined : '#1d51da' }}
        onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#1646c4')}
        onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#1d51da')}
      >
        {isLoading ? '記録中...' : '顧客承認'}
      </button>
      <button
        onClick={handleReject}
        disabled={isLoading}
        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      >
        {isLoading ? '記録中...' : '顧客却下'}
      </button>
    </div>
  )
}
