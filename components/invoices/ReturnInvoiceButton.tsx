'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface ReturnInvoiceButtonProps {
  invoiceId: string
  userRole: string
}

export function ReturnInvoiceButton({ invoiceId, userRole }: ReturnInvoiceButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [reason, setReason] = useState('')
  const [csrfToken, setCsrfToken] = useState('')

  useEffect(() => {
    // CSRFトークンを取得
    const fetchCsrfToken = async () => {
      try {
        const response = await fetch('/api/csrf-token')
        const data = await response.json()
        setCsrfToken(data.token)
      } catch (error) {
        console.error('Failed to fetch CSRF token:', error)
      }
    }
    fetchCsrfToken()
  }, [])

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)

  if (!isManagerOrAdmin) {
    return null
  }

  const handleReturn = async () => {
    if (!reason.trim()) {
      alert('差し戻し理由を入力してください')
      return
    }

    if (!confirm('この請求書を差し戻しますか？')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '差し戻しに失敗しました')
      }

      alert('請求書を差し戻しました')
      router.refresh()
      setShowModal(false)
    } catch (error) {
      console.error('Error returning invoice:', error)
      alert(error instanceof Error ? error.message : '差し戻しに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600"
        disabled={loading}
      >
        差し戻し
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">請求書を差し戻し</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                差し戻し理由 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="差し戻し理由を入力..."
                required
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
                onClick={handleReturn}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                disabled={loading}
              >
                {loading ? '差し戻し中...' : '差し戻す'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
