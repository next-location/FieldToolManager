'use client'

import { TerminalsTable } from '../../terminals/TerminalsTable'

interface AttendanceTerminalsTabProps {
  sitesList: Array<{ id: string; name: string }>
  userRole: string
}

export function AttendanceTerminalsTab({ sitesList, userRole }: AttendanceTerminalsTabProps) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">タブレット端末管理</h2>
        <p className="mt-1 text-sm text-gray-600">
          QRコード表示用のタブレット端末を管理します
        </p>
      </div>
      <TerminalsTable sitesList={sitesList} userRole={userRole} />
    </div>
  )
}
