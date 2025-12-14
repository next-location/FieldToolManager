'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApproveEstimateButtonProps {
  estimateId: string
  isApproved: boolean
  userRole: string
  onSuccess?: () => void
}

export function ApproveEstimateButton({
  estimateId,
  isApproved,
  userRole,
  onSuccess
}: ApproveEstimateButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState('')

  // manager以上のみ表示
  if (!['manager', 'admin', 'super_admin'].includes(userRole)) {
    return null
  }

  const handleApprove = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/estimates/${estimateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '承認に失敗しました')
      }

      alert('見積書を承認しました')
      setShowModal(false)
      setNotes('')
      router.refresh()
      onSuccess?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleUnapprove = async () => {
    if (!confirm('承認を取り消しますか？')) return

    setLoading(true)
    try {
      const response = await fetch(`/api/estimates/${estimateId}/approve`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || '承認取り消しに失敗しました')
      }

      alert('承認を取り消しました')
      router.refresh()
      onSuccess?.()
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認取り消しに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (isApproved) {
    return (
      <button
        onClick={handleUnapprove}
        disabled={loading}
        className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? '処理中...' : '承認取り消し'}
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        承認する
      </button>

      {/* 承認モーダル */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">見積書を承認</h3>

            <div className="mb-4">
              <label htmlFor="approval-notes" className="block text-sm font-medium text-gray-700 mb-2">
                承認メモ（任意）
              </label>
              <textarea
                id="approval-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="承認に関するメモを入力できます"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '承認中...' : '承認する'}
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setNotes('')
                }}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
