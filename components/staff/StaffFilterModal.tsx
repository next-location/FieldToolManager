'use client'

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
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center sm:items-center">
        {/* 背景オーバーレイ */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* モーダルコンテンツ */}
        <div className="relative bg-white rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-lg transform transition-all">
          {/* ヘッダー */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">絞り込み</h3>
          </div>

          {/* フィルター内容 */}
          <div className="px-6 py-4 space-y-4">
            {/* 部署フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                部署
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全ての部署</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* 権限フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                権限
              </label>
              <select
                value={roleFilter}
                onChange={(e) => onRoleChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全ての権限</option>
                <option value="admin">管理者</option>
                <option value="leader">リーダー</option>
                <option value="staff">一般スタッフ</option>
              </select>
            </div>

            {/* 状態フィルター */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                状態
              </label>
              <select
                value={statusFilter}
                onChange={(e) => onStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全ての状態</option>
                <option value="active">有効</option>
                <option value="inactive">無効</option>
              </select>
            </div>
          </div>

          {/* フッター */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              リセット
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                適用
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
