'use client'

import { X } from 'lucide-react'

interface AuditLogFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  actionFilter: string
  entityFilter: string
  userFilter: string
  startDate: string
  endDate: string
  onActionChange: (value: string) => void
  onEntityChange: (value: string) => void
  onUserChange: (value: string) => void
  onStartDateChange: (value: string) => void
  onEndDateChange: (value: string) => void
  onApply: () => void
  onReset: () => void
  uniqueActions: string[]
  uniqueEntities: string[]
  uniqueUsers: { id: string; name: string }[]
  getActionLabel: (action: string) => string
  getEntityLabel: (entity: string) => string
}

export default function AuditLogFiltersModal({
  isOpen,
  onClose,
  actionFilter,
  entityFilter,
  userFilter,
  startDate,
  endDate,
  onActionChange,
  onEntityChange,
  onUserChange,
  onStartDateChange,
  onEndDateChange,
  onApply,
  onReset,
  uniqueActions,
  uniqueEntities,
  uniqueUsers,
  getActionLabel,
  getEntityLabel,
}: AuditLogFiltersModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onApply()
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-[60] animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-xl z-[70] max-h-[80vh] overflow-hidden flex flex-col animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 pb-8 space-y-4">
          {/* 開始日 */}
          <div>
            <label
              htmlFor="modal-start-date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              開始日
            </label>
            <input
              type="date"
              id="modal-start-date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 終了日 */}
          <div>
            <label
              htmlFor="modal-end-date"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              終了日
            </label>
            <input
              type="date"
              id="modal-end-date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* アクションフィルター */}
          <div>
            <label
              htmlFor="modal-action"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              操作
            </label>
            <select
              id="modal-action"
              value={actionFilter}
              onChange={(e) => onActionChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              {uniqueActions.map((action) => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
          </div>

          {/* エンティティフィルター */}
          <div>
            <label
              htmlFor="modal-entity"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              エンティティ
            </label>
            <select
              id="modal-entity"
              value={entityFilter}
              onChange={(e) => onEntityChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              {uniqueEntities.map((entity) => (
                <option key={entity} value={entity}>
                  {getEntityLabel(entity)}
                </option>
              ))}
            </select>
          </div>

          {/* スタッフフィルター */}
          <div>
            <label
              htmlFor="modal-user"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              スタッフ
            </label>
            <select
              id="modal-user"
              value={userFilter}
              onChange={(e) => onUserChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              {uniqueUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            リセット
          </button>
          <button
            onClick={handleApply}
            className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
