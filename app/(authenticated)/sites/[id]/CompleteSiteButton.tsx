'use client'

import { completeSite } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CompleteSiteButton({ siteId }: { siteId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleComplete = async () => {
    if (!confirm('この現場を完了にしますか？')) {
      return
    }

    setIsLoading(true)
    try {
      await completeSite(siteId)
      router.refresh()
    } catch (error) {
      alert('完了処理に失敗しました')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleComplete}
      disabled={isLoading}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-sm font-medium"
    >
      {isLoading ? '処理中...' : '完了にする'}
    </button>
  )
}
