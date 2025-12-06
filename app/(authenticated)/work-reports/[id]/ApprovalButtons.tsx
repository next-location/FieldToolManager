'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApprovalButtonsProps {
  reportId: string
  status: string
}

export function ApprovalButtons({ reportId, status }: ApprovalButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showCommentModal, setShowCommentModal] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')

  const handleAction = async (actionType: 'approve' | 'reject') => {
    setAction(actionType)
    setShowCommentModal(true)
  }

  const submitAction = async () => {
    if (!action) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/work-reports/${reportId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `${action === 'approve' ? '承認' : '却下'}に失敗しました`)
      }

      // 成功したらモーダルを閉じてページをリロード
      setShowCommentModal(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : `${action === 'approve' ? '承認' : '却下'}に失敗しました`)
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowCommentModal(false)
    setAction(null)
    setComment('')
    setError('')
  }

  if (status !== 'submitted') {
    return null
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => handleAction('reject')}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 disabled:opacity-50"
        >
          却下
        </button>
        <button
          onClick={() => handleAction('approve')}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          承認
        </button>
      </div>

      {/* コメント入力モーダル */}
      {showCommentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {action === 'approve' ? '承認' : '却下'}コメント
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                コメント {action === 'reject' && <span className="text-gray-500">(任意)</span>}
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder={action === 'approve' ? '承認コメントを入力してください（任意）' : '却下理由を入力してください（任意）'}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={submitAction}
                disabled={loading}
                className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                  action === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? '処理中...' : action === 'approve' ? '承認する' : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
