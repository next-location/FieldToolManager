'use client'

import { useState } from 'react'
import { AttendanceFilter } from './AttendanceFilter'
import { AttendanceRecordsTable } from './AttendanceRecordsTable'
import { ProxyClockInModal } from './ProxyClockInModal'
import { Plus } from 'lucide-react'

interface Staff {
  id: string
  name: string
  email: string
}

interface Site {
  id: string
  name: string
}

interface AttendanceRecordsWrapperProps {
  staffList: Staff[]
  sitesList: Site[]
  userRole: string
  currentUserId: string
  isAdminOrManager: boolean
}

export function AttendanceRecordsWrapper({
  staffList,
  sitesList,
  userRole,
  currentUserId,
  isAdminOrManager,
}: AttendanceRecordsWrapperProps) {
  const [filters, setFilters] = useState({
    user_id: isAdminOrManager ? '' : currentUserId, // leader/userは自分のIDで固定
    start_date: '',
    end_date: '',
    location_type: '',
    site_id: '',
  })

  const [isProxyModalOpen, setIsProxyModalOpen] = useState(false)
  const [tableKey, setTableKey] = useState(0)

  const handleProxySuccess = () => {
    setTableKey((prev) => prev + 1) // テーブルを再読み込み
  }

  return (
    <>
      {/* PC表示: 右上に代理打刻ボタン */}
      {isAdminOrManager && (
        <div className="hidden sm:flex justify-end mb-4">
          <button
            onClick={() => setIsProxyModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + 代理打刻
          </button>
        </div>
      )}

      <AttendanceFilter
        staffList={staffList}
        sitesList={sitesList}
        onFiltersChange={setFilters}
        showStaffFilter={isAdminOrManager} // admin/managerのみスタッフフィルター表示
      />

      <AttendanceRecordsTable
        key={tableKey}
        userRole={userRole}
        filters={filters}
        showStaffName={true} // スタッフ名を常に表示
        showStaffSort={isAdminOrManager} // admin/managerのみソート表示
      />

      {/* スマホ表示: FABボタン（道具一覧と同じスタイル） */}
      {isAdminOrManager && (
        <button
          onClick={() => setIsProxyModalOpen(true)}
          className="fixed right-4 bottom-24 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 sm:hidden"
          aria-label="代理打刻"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}

      {/* 代理打刻モーダル */}
      <ProxyClockInModal
        staffList={staffList}
        sitesList={sitesList}
        isOpen={isProxyModalOpen}
        onClose={() => setIsProxyModalOpen(false)}
        onSuccess={handleProxySuccess}
      />
    </>
  )
}