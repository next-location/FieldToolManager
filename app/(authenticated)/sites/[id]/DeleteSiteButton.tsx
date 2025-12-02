'use client'

import { deleteSite } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function DeleteSiteButton({ siteId }: { siteId: string }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    if (!confirm('この現場を削除しますか？（この操作は取り消せません）')) {
      return
    }

    setIsLoading(true)
    try {
      await deleteSite(siteId)
      // 削除成功後、手動でリダイレクト
      router.push('/sites')
      router.refresh()
    } catch (error) {
      alert('削除に失敗しました')
      console.error(error)
      setIsLoading(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isLoading}
      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 text-sm font-medium"
    >
      {isLoading ? '削除中...' : '削除'}
    </button>
  )
}
