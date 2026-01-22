'use client'

import { useState } from 'react'
import { AttendanceFilter } from './AttendanceFilter'
import { AttendanceRecordsTable } from './AttendanceRecordsTable'

interface Staff {
  id: string
  name: string
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
}

export function AttendanceRecordsWrapper({
  staffList,
  sitesList,
  userRole,
  currentUserId,
}: AttendanceRecordsWrapperProps) {
  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  const [filters, setFilters] = useState({
    user_id: isAdminOrManager ? '' : currentUserId, // leader/userは自分のIDで固定
    start_date: '',
    end_date: '',
    location_type: '',
    site_id: '',
  })

  return (
    <>
      <AttendanceFilter
        staffList={staffList}
        sitesList={sitesList}
        onFiltersChange={setFilters}
        showStaffFilter={isAdminOrManager} // admin/managerのみスタッフフィルター表示
      />

      <AttendanceRecordsTable
        userRole={userRole}
        filters={filters}
        showStaffName={true} // スタッフ名を常に表示
        showStaffSort={isAdminOrManager} // admin/managerのみソート表示
      />
    </>
  )
}