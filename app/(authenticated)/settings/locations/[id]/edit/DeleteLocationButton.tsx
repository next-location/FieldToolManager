'use client'

import { deleteLocation } from '../../actions'

export function DeleteLocationButton({ locationId }: { locationId: string }) {
  const handleDelete = async (formData: FormData) => {
    if (!confirm('本当にこの拠点を削除しますか？この操作は取り消せません。')) {
      return
    }
    await deleteLocation(locationId)
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-200">
      <h2 className="text-sm font-medium text-gray-900 mb-2">危険操作</h2>
      <p className="text-sm text-gray-600 mb-4">
        この拠点を削除します。削除した拠点は復元できません。
      </p>
      <form action={handleDelete}>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
        >
          拠点を削除
        </button>
      </form>
    </div>
  )
}
