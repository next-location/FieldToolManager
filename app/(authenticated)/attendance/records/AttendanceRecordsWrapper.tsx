'use client'

import { useState, useEffect } from 'react'
import { AttendanceFilter } from './AttendanceFilter'
import { AttendanceRecordsTable } from './AttendanceRecordsTable'
import { ProxyClockInModal } from './ProxyClockInModal'
import { AttendanceExportButton } from './AttendanceExportButton'
import AttendanceRecordsFAB from '@/components/attendance/AttendanceRecordsFAB'

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
  organizationName: string
}

export function AttendanceRecordsWrapper({
  staffList,
  sitesList,
  userRole,
  currentUserId,
  isAdminOrManager,
  organizationName,
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
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">勤務記録一覧</h1>
          <div className="hidden sm:flex gap-3">
            <AttendanceExportButton filters={filters} />
            {isAdminOrManager && (
              <button
                onClick={() => setIsProxyModalOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                + 代理打刻
              </button>
            )}
          </div>
          <div className="sm:hidden flex items-center gap-2">
            <AttendanceExportButton filters={filters} mobileMenuOnly />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          {isAdminOrManager
            ? `${organizationName} のスタッフの出退勤記録を確認・編集できます`
            : `${organizationName} のスタッフの出退勤記録を確認できます（閲覧のみ）`}
        </p>
      </div>

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

      {/* 代理打刻モーダル */}
      <ProxyClockInModal
        staffList={staffList}
        sitesList={sitesList}
        isOpen={isProxyModalOpen}
        onClose={() => setIsProxyModalOpen(false)}
        onSuccess={handleProxySuccess}
      />

      {/* FAB for mobile */}
      <AttendanceRecordsFAB
        onClick={() => setIsProxyModalOpen(true)}
        isAdminOrManager={isAdminOrManager}
      />
    </>
  )
}