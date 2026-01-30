'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApproveInvoiceButtonProps {
  invoiceId: string
  userRole: string
}

export function ApproveInvoiceButton({ invoiceId, userRole }: ApproveInvoiceButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState('')

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)

  if (!isManagerOrAdmin) {
    return null
  }

  const handleApprove = async () => {
    if (!confirm('この請求書を承認しますか？')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '承認に失敗しました')
      }

      alert('請求書を承認しました')
      router.refresh()
      setShowModal(false)
    } catch (error) {
      console.error('Error approving invoice:', error)
      alert(error instanceof Error ? error.message : '承認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
        disabled={loading}
      >
        承認
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">請求書を承認</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                承認コメント（任意）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="承認コメントを入力..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                disabled={loading}
              >
                {loading ? '承認中...' : '承認する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
