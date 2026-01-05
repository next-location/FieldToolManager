'use client'

import { X } from 'lucide-react'

interface StaffFilterModalProps {
  isOpen: boolean
  onClose: () => void
  departmentFilter: string
  roleFilter: string
  statusFilter: string
  onDepartmentChange: (value: string) => void
  onRoleChange: (value: string) => void
  onStatusChange: (value: string) => void
  departments: string[]
}

export default function StaffFilterModal({
  isOpen,
  onClose,
  departmentFilter,
  roleFilter,
  statusFilter,
  onDepartmentChange,
  onRoleChange,
  onStatusChange,
  departments
}: StaffFilterModalProps) {
  if (!isOpen) return null

  const handleApply = () => {
    onClose()
  }

  const handleReset = () => {
    onDepartmentChange('all')
    onRoleChange('all')
    onStatusChange('active')
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
          {/* 部署フィルター */}
          <div>
            <label
              htmlFor="modal-department"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              部署
            </label>
            <select
              id="modal-department"
              value={departmentFilter}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 権限フィルター */}
          <div>
            <label
              htmlFor="modal-role"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              権限
            </label>
            <select
              id="modal-role"
              value={roleFilter}
              onChange={(e) => onRoleChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="admin">管理者</option>
              <option value="leader">リーダー</option>
              <option value="staff">一般スタッフ</option>
            </select>
          </div>

          {/* 状態フィルター */}
          <div>
            <label
              htmlFor="modal-status"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              状態
            </label>
            <select
              id="modal-status"
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">すべて</option>
              <option value="active">有効</option>
              <option value="inactive">無効</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={handleReset}
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
