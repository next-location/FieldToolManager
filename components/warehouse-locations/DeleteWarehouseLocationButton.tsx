'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteWarehouseLocation } from '@/app/(authenticated)/warehouse-locations/actions'

export function DeleteWarehouseLocationButton({
  locationId,
  locationName,
  hasTools,
  hasConsumables,
}: {
  locationId: string
  locationName: string
  hasTools: boolean
  hasConsumables: boolean
}) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (hasTools || hasConsumables) {
      alert(
        'この倉庫位置には道具または消耗品が保管されています。\n先に道具・消耗品を移動してから削除してください。'
      )
      return
    }

    const confirmed = window.confirm(
      `倉庫位置「${locationName}」を削除してもよろしいですか？\n\nこの操作は取り消せません。`
    )

    if (!confirmed) return

    setIsDeleting(true)
    try {
      await deleteWarehouseLocation(locationId)
      router.push('/warehouse-locations')
      router.refresh()
    } catch (error: any) {
      alert(`削除に失敗しました: ${error.message}`)
      setIsDeleting(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isDeleting ? '削除中...' : '削除'}
    </button>
  )
}
