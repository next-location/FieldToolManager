'use client'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  staffName: string
}

export function DeleteConfirmModal({ isOpen, onClose, onConfirm, staffName }: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">スタッフの削除確認</h2>

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2">以下のスタッフを削除してもよろしいですか？</p>
          <p className="text-lg font-semibold text-gray-900">{staffName}</p>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              ⚠️ 注意: この操作は論理削除されます。
            </p>
            <p className="text-sm text-yellow-800 mt-2">
              過去の履歴データは保持されますが、このスタッフはシステムにアクセスできなくなります。
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}
