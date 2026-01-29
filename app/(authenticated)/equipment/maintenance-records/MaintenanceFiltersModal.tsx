'use client'

interface MaintenanceFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  selectedType: string
  sortBy: string
  onTypeChange: (value: string) => void
  onSortChange: (value: string) => void
  onReset: () => void
}

export default function MaintenanceFiltersModal({
  isOpen,
  onClose,
  selectedType,
  sortBy,
  onTypeChange,
  onSortChange,
  onReset,
}: MaintenanceFiltersModalProps) {
  if (!isOpen) return null

  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle_inspection':
        return '車検'
      case 'insurance_renewal':
        return '保険更新'
      case 'repair':
        return '修理'
      case 'other':
        return 'その他'
      default:
        return type
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">フィルター</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* 点検タイプ */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  点検タイプ
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => onTypeChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">すべて</option>
                  <option value="vehicle_inspection">車検</option>
                  <option value="insurance_renewal">保険更新</option>
                  <option value="repair">修理</option>
                  <option value="other">その他</option>
                </select>
              </div>

              {/* 並び順 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  並び順
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="date">実施日順</option>
                  <option value="cost">費用順</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
            >
              適用
            </button>
            <button
              type="button"
              onClick={onReset}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
            >
              クリア
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
