'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface SendInvoiceButtonProps {
  invoiceId: string
  userRole: string
  clientEmail?: string
}

export function SendInvoiceButton({ invoiceId, userRole, clientEmail }: SendInvoiceButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [email, setEmail] = useState(clientEmail || '')
  const [message, setMessage] = useState('')

  const isManagerOrAdmin = ['manager', 'admin', 'super_admin'].includes(userRole)

  if (!isManagerOrAdmin) {
    return null
  }

  const handleSend = async () => {
    if (!email) {
      alert('送付先のメールアドレスを入力してください')
      return
    }

    if (!confirm(`${email} へ請求書を送付しますか？`)) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, message }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '送付に失敗しました')
      }

      alert('請求書を送付しました')
      router.refresh()
      setShowModal(false)
    } catch (error) {
      console.error('Error sending invoice:', error)
      alert(error instanceof Error ? error.message : '送付に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-600"
        disabled={loading}
      >
        顧客送付
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">請求書を送付</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                送付先メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="customer@example.com"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                メッセージ（任意）
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="送付メッセージを入力..."
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
                onClick={handleSend}
                className="px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600"
                disabled={loading}
              >
                {loading ? '送付中...' : '送付する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
