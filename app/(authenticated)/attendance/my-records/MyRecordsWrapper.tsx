'use client'

import { useState } from 'react'
import { MyRecordsHeader } from './MyRecordsHeader'
import { MyAttendanceRecordsTable } from './MyAttendanceRecordsTable'

interface MyRecordsWrapperProps {
  userName: string
  userId: string
  isViewingOtherUser: boolean
}

export function MyRecordsWrapper({
  userName,
  userId,
  isViewingOtherUser,
}: MyRecordsWrapperProps) {
  const [currentMonth, setCurrentMonth] = useState<string>('')

  return (
    <>
      <MyRecordsHeader
        userName={userName}
        userId={userId}
        isViewingOtherUser={isViewingOtherUser}
        currentMonth={currentMonth}
      />

      <div className="bg-white shadow sm:rounded-lg">
        <MyAttendanceRecordsTable
          userName={userName}
          userId={userId}
          onMonthChange={setCurrentMonth}
        />
      </div>
    </>
  )
}
