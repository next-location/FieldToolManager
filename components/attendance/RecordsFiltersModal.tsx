'use client'

import { X } from 'lucide-react'

interface Staff {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
}

interface RecordsFiltersModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  setUserId: (value: string) => void
  yearMonth: string
  setYearMonth: (value: string) => void
  locationType: string
  setLocationType: (value: string) => void
  siteId: string
  setSiteId: (value: string) => void
  staffList: Staff[]
  sitesList: Site[]
  onReset: () => void
}

export default function RecordsFiltersModal({
  isOpen,
  onClose,
  userId,
  setUserId,
  yearMonth,
  setYearMonth,
  locationType,
  setLocationType,
  siteId,
  setSiteId,
  staffList,
  sitesList,
  onReset,
}: RecordsFiltersModalProps) {
  if (!isOpen) return null

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
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">フィルター</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="閉じる"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* スタッフ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スタッフ
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全員</option>
              {staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.name}
                </option>
              ))}
            </select>
          </div>

          {/* 年月 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              年月
            </label>
            <input
              type="month"
              value={yearMonth}
              onChange={(e) => setYearMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 出勤場所 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              出勤場所
            </label>
            <select
              value={locationType}
              onChange={(e) => setLocationType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              <option value="office">会社</option>
              <option value="site">現場</option>
              <option value="remote">リモート</option>
            </select>
          </div>

          {/* 現場 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              現場
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">すべて</option>
              {sitesList.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 flex gap-3">
          <button
            onClick={onReset}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            リセット
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            適用
          </button>
        </div>
      </div>
    </>
  )
}
