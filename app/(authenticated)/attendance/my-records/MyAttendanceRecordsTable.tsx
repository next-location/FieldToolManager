'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MyAttendanceRecordsTableProps {
  userName: string
  userId: string
  onMonthChange?: (month: string) => void
}

export function MyAttendanceRecordsTable({
  userName,
  userId,
  onMonthChange,
}: MyAttendanceRecordsTableProps) {
  // デフォルトは今月
  const getDefaultYearMonth = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }

  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [leaveRecords, setLeaveRecords] = useState<any[]>([])
  const [dailyRecords, setDailyRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(getDefaultYearMonth())

  // 月が変わったら親に通知
  useEffect(() => {
    if (onMonthChange) {
      onMonthChange(currentMonth)
    }
  }, [currentMonth, onMonthChange])

  // 月次集計
  const [monthlyStats, setMonthlyStats] = useState({
    totalDays: 0,
    totalHours: 0,
    averageHours: 0,
  })

  // データ取得と毎日のレコード生成
  useEffect(() => {
    fetchAllData()
  }, [currentMonth, userId])

  useEffect(() => {
    generateDailyRecords()
  }, [attendanceRecords, leaveRecords, currentMonth])

  // 年月から開始日・終了日を計算
  const getMonthRange = (yearMonth: string) => {
    if (!yearMonth) return { start: '', end: '' }

    const [year, month] = yearMonth.split('-').map(Number)
    const start = `${year}-${String(month).padStart(2, '0')}-01`
    const end = new Date(year, month, 0).toISOString().split('T')[0]

    return { start, end }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const { start, end } = getMonthRange(currentMonth)

      // 出退勤記録を取得
      const attendanceParams = new URLSearchParams({
        user_id: userId,
        limit: '1000',
        ...(start && { start_date: start }),
        ...(end && { end_date: end }),
      })

      const attendanceResponse = await fetch(`/api/attendance/records?${attendanceParams}`)
      if (attendanceResponse.ok) {
        const attendanceData = await attendanceResponse.json()
        setAttendanceRecords(attendanceData.records || [])
      }

      // 休暇記録を取得
      const leaveParams = new URLSearchParams({
        user_id: userId,
        ...(start && { start_date: start }),
        ...(end && { end_date: end }),
      })

      const leaveResponse = await fetch(`/api/leave?${leaveParams}`)
      if (leaveResponse.ok) {
        const leaveData = await leaveResponse.json()
        setLeaveRecords(leaveData.leaves || [])
      }
    } catch (error) {
      console.error('Failed to fetch records:', error)
    } finally {
      setLoading(false)
    }
  }

  // 毎日のレコード生成（出勤/休暇/休み）
  const generateDailyRecords = () => {
    if (!currentMonth) return

    const [year, month] = currentMonth.split('-').map(Number)
    const daysInMonth = new Date(year, month, 0).getDate()
    const today = new Date()
    const currentDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())

    const daily: any[] = []
    let workDays = 0
    let totalMinutes = 0

    for (let day = 1; day <= daysInMonth; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dateObj = new Date(year, month - 1, day)

      // 未来の日付は除外
      if (dateObj > currentDate) continue

      // この日の出退勤記録を探す
      const attendance = attendanceRecords.find((r) => r.date === date)

      // この日の休暇記録を探す
      const leave = leaveRecords.find((l) => l.leave_date === date)

      if (attendance) {
        // 出退勤記録がある場合
        daily.push({
          ...attendance,
          type: 'attendance',
          date,
        })

        // 勤務時間を集計
        if (attendance.clock_out_time) {
          workDays++
          const clockIn = new Date(attendance.clock_in_time)
          const clockOut = new Date(attendance.clock_out_time)
          const diffMs = clockOut.getTime() - clockIn.getTime()
          totalMinutes += Math.floor(diffMs / (1000 * 60))
        }
      } else if (leave) {
        // 休暇記録がある場合
        daily.push({
          id: `leave-${leave.id}`,
          type: 'leave',
          date,
          leave_type: leave.leave_type,
          leave_reason: leave.reason,
        })
      } else {
        // どちらもない場合は「休み」
        daily.push({
          id: `rest-${date}`,
          type: 'rest',
          date,
        })
      }
    }

    // 日付降順でソート
    daily.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setDailyRecords(daily)

    // 月次集計を更新
    const totalHours = totalMinutes / 60
    const averageHours = workDays > 0 ? totalHours / workDays : 0

    setMonthlyStats({
      totalDays: workDays,
      totalHours: Math.floor(totalHours * 10) / 10,
      averageHours: Math.floor(averageHours * 10) / 10,
    })
  }

  // 月を変更
  const changeMonth = (offset: number) => {
    if (!currentMonth) return

    const [year, month] = currentMonth.split('-').map(Number)
    const newDate = new Date(year, month - 1 + offset, 1)
    const newYearMonth = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`

    setCurrentMonth(newYearMonth)
  }

  // 勤務時間計算（時間:分）
  const calculateWorkHours = (record: any) => {
    if (!record.clock_in_time || !record.clock_out_time) return '---'

    const clockIn = new Date(record.clock_in_time)
    const clockOut = new Date(record.clock_out_time)
    const diffMs = clockOut.getTime() - clockIn.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return `${hours}:${minutes.toString().padStart(2, '0')}`
  }

  // 時刻フォーマット
  const formatTime = (datetime: string | null) => {
    if (!datetime) return '---'
    return new Date(datetime).toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 日付フォーマット
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
    })
  }

  // 休暇種別ラベル
  const leaveTypeLabels: Record<string, string> = {
    paid: '有給休暇',
    sick: '病気休暇',
    personal: '私用休暇',
    other: 'その他',
  }

  if (loading && dailyRecords.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {/* 月次集計 */}
      <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-blue-600">出勤日数</div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-blue-900">
            {monthlyStats.totalDays}<span className="text-sm sm:text-base ml-0.5">日</span>
          </div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-green-600 whitespace-nowrap">総勤務時間</div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-green-900">
            {monthlyStats.totalHours}<span className="text-sm sm:text-base ml-0.5">h</span>
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
          <div className="text-xs sm:text-sm font-medium text-purple-600 whitespace-nowrap">平均時間</div>
          <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-bold text-purple-900">
            {monthlyStats.averageHours}<span className="text-sm sm:text-base ml-0.5">h</span>
          </div>
        </div>
      </div>

      {/* 月ナビゲーション */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeMonth(-1)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="前月"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="month"
            value={currentMonth}
            onChange={(e) => setCurrentMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => changeMonth(1)}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="次月"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {dailyRecords.length}日分の記録
        </div>
      </div>

      {/* PC: テーブル表示 */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                日付
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                出勤
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                退勤
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                勤務時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                場所
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {dailyRecords.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(record.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {record.type === 'attendance' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      出勤
                    </span>
                  )}
                  {record.type === 'leave' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {leaveTypeLabels[record.leave_type]}
                    </span>
                  )}
                  {record.type === 'rest' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      休み
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.type === 'attendance' ? formatTime(record.clock_in_time) : '---'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.type === 'attendance' && record.clock_out_time ? (
                    formatTime(record.clock_out_time)
                  ) : record.type === 'attendance' && !record.clock_out_time ? (
                    <span className="text-green-600 font-medium">勤務中</span>
                  ) : (
                    '---'
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {record.type === 'attendance' ? calculateWorkHours(record) : '---'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {record.type === 'attendance' && (
                    <>
                      {record.clock_in_location_type === 'office' && '会社'}
                      {record.clock_in_location_type === 'site' &&
                        `現場: ${record.clock_in_site_name || '---'}`}
                      {record.clock_in_location_type === 'remote' && 'リモート'}
                    </>
                  )}
                  {record.type === 'leave' && record.leave_reason && (
                    <span className="text-xs text-gray-400">{record.leave_reason}</span>
                  )}
                  {record.type === 'rest' && '---'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* モバイル: カード表示 */}
      <div className="sm:hidden space-y-3">
        {dailyRecords.map((record) => (
          <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-3">
              <div className="text-sm font-medium text-gray-900">
                {formatDate(record.date)}
              </div>
              <div className="flex flex-col items-end gap-1">
                {record.type === 'attendance' && (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                    出勤
                  </span>
                )}
                {record.type === 'leave' && (
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full font-medium">
                    {leaveTypeLabels[record.leave_type]}
                  </span>
                )}
                {record.type === 'rest' && (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded-full font-medium">
                    休み
                  </span>
                )}
                {record.is_manually_edited && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    編集済
                  </span>
                )}
              </div>
            </div>

            {record.type === 'attendance' && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-500 mb-1">出勤</div>
                  <div className="font-medium text-gray-900">{formatTime(record.clock_in_time)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">退勤</div>
                  <div className="font-medium text-gray-900">{formatTime(record.clock_out_time)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">勤務時間</div>
                  <div className="font-medium text-gray-900">{calculateWorkHours(record)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">場所</div>
                  <div className="font-medium text-gray-900">
                    {record.clock_in_location_type === 'office' && '会社'}
                    {record.clock_in_location_type === 'site' &&
                      `${record.clock_in_site_name || '現場'}`}
                    {record.clock_in_location_type === 'remote' && 'リモート'}
                  </div>
                </div>
              </div>
            )}

            {record.type === 'leave' && record.leave_reason && (
              <div className="text-sm text-gray-600 mt-2">
                理由: {record.leave_reason}
              </div>
            )}
          </div>
        ))}
      </div>

      {dailyRecords.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">この月のデータがありません</p>
        </div>
      )}
    </div>
  )
}
