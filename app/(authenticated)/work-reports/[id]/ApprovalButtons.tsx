'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApprovalButtonsProps {
  reportId: string
}

export function ApprovalButtons({ reportId }: ApprovalButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [action, setAction] = useState<'approved' | 'rejected' | null>(null)
  const [comment, setComment] = useState('')

  const handleOpenModal = (actionType: 'approved' | 'rejected') => {
    setAction(actionType)
    setComment('')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (!action) return

    setLoading(true)
    try {
      const response = await fetch(`/api/work-reports/${reportId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          comment: comment.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'çÊk1WW~W_')
      }

      alert(action === 'approved' ? 'çW~W_' : 'tW~W_')
      setShowModal(false)
      router.refresh()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'çÊk1WW~W_')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <button
          onClick={() => handleOpenModal('rejected')}
          disabled={loading}
          className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50"
        >
          t
        </button>
        <button
          onClick={() => handleOpenModal('approved')}
          disabled={loading}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
        >
          ç
        </button>
      </div>

      {/* ç/t‚¸¿Î */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {action === 'approved' ? 'ç∫ç' : 't∫ç'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {action === 'approved'
                ? 'Sn\m1J¯íçW~YK'
                : 'Sn\m1J¯ítW~YK'}
            </p>

            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                ≥·Û»˚	
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="≥·Û»íeõWfO`UD"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                ≠„ÛªÎ
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white disabled:opacity-50 ${
                  action === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Ê-...' : action === 'approved' ? 'çYã' : 'tYã'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
