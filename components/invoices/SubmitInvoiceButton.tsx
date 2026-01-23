'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

export function SubmitInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async () => {
    if (!confirm('この請求書を提出してもよろしいですか？\n提出後は編集できなくなります。')) {
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/submit`, {
        method: 'POST',
        headers: {
          'X-CSRF-Token': csrfToken
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '提出に失敗しました')
      }

      alert('請求書を提出しました')
      router.refresh()
    } catch (error: any) {
      alert(error.message || '提出に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleSubmit}
      disabled={loading}
      className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600 disabled:bg-gray-400"
    >
      {loading ? '提出中...' : '提出'}
    </button>
  )
}
