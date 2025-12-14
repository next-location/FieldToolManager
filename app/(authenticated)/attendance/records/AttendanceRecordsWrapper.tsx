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
}

export function AttendanceRecordsWrapper({
  staffList,
  sitesList,
  userRole,
}: AttendanceRecordsWrapperProps) {
  const [filters, setFilters] = useState({
    user_id: '',
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
      />

      <AttendanceRecordsTable
        userRole={userRole}
        filters={filters}
      />
    </>
  )
}