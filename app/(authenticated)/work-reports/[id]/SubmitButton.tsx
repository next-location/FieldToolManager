'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

interface SubmitButtonProps {
  reportId: string
  status: string
}

export function SubmitButton({ reportId, status }: SubmitButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/work-reports/${reportId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '提出に失敗しました')
      }

      // 成功したらモーダルを閉じてページをリロード
      setShowConfirm(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '提出に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const closeModal = () => {
    setShowConfirm(false)
    setError('')
  }

  // draft または rejected ステータスの場合のみ表示
  if (status !== 'draft' && status !== 'rejected') {
    return null
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
        disabled={loading}
        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        提出
      </button>

      {/* 確認モーダル */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              作業報告書の提出
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <p className="text-sm text-gray-700 mb-6">
              この作業報告書を提出しますか？提出後は承認者による確認が行われます。
              {status === 'rejected' && (
                <span className="block mt-2 text-orange-600 font-medium">
                  ※ 却下された報告書の再提出になります
                </span>
              )}
            </p>

            <div className="flex gap-3">
              <button
                onClick={closeModal}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? '提出中...' : '提出する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
