'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { AttendanceStatusResponse } from '@/types/attendance'

export function AttendanceWidget() {
  const [status, setStatus] = useState<AttendanceStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  // 打刻状態を取得
  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/attendance/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch attendance status:', error)
    } finally {
      setLoading(false)
    }
  }

  // 出勤打刻
  const handleClockIn = async () => {
    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/clock-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_type: 'office',
          method: 'manual',
          device_type: 'desktop',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '出勤打刻に失敗しました')
      }

      setMessage({ type: 'success', text: '出勤打刻が完了しました' })
      await fetchStatus()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 退勤打刻
  const handleClockOut = async () => {
    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location_type: 'office',
          method: 'manual',
          device_type: 'desktop',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '退勤打刻に失敗しました')
      }

      setMessage({ type: 'success', text: '退勤打刻が完了しました' })
      await fetchStatus()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 休憩開始
  const handleBreakStart = async () => {
    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/break/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '休憩開始の記録に失敗しました')
      }

      setMessage({ type: 'success', text: '休憩を開始しました' })
      await fetchStatus()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 休憩終了
  const handleBreakEnd = async () => {
    setActionLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/attendance/break/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '休憩終了の記録に失敗しました')
      }

      setMessage({ type: 'success', text: '休憩を終了しました' })
      await fetchStatus()
      router.refresh()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setActionLoading(false)
    }
  }

  // 休憩中かどうかを判定
  const isOnBreak = () => {
    if (!status?.today_record?.break_records) return false
    const breakRecords = status.today_record.break_records as any[]
    return breakRecords.some((br: any) => br.start && !br.end)
  }

  // 勤務時間を計算（分単位）
  const getWorkDuration = () => {
    if (!status?.today_record?.clock_in_time) return null

    const clockIn = new Date(status.today_record.clock_in_time)
    const clockOut = status.today_record.clock_out_time
      ? new Date(status.today_record.clock_out_time)
      : new Date()

    const diffMs = clockOut.getTime() - clockIn.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))

    const hours = Math.floor(diffMinutes / 60)
    const minutes = diffMinutes % 60

    return { hours, minutes }
  }

  const duration = getWorkDuration()

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">出退勤</h3>
          {status?.is_clocked_in && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              勤務中
            </span>
          )}
        </div>

        {message && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {!status?.is_clocked_in ? (
          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-gray-600 mb-4">本日の出勤打刻がまだです</p>
              <button
                onClick={handleClockIn}
                disabled={actionLoading}
                className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
              >
                {actionLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    出勤する
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-blue-800">
                    出勤時刻: {status.clock_in_time ? new Date(status.clock_in_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '---'}
                  </p>
                  {status.location_type === 'office' && (
                    <p className="text-xs text-blue-700 mt-1">会社出勤</p>
                  )}
                  {status.location_type === 'site' && status.site_name && (
                    <p className="text-xs text-blue-700 mt-1">現場出勤: {status.site_name}</p>
                  )}
                  {duration && (
                    <p className="text-xs text-blue-700 mt-1">
                      勤務時間: {duration.hours}時間{duration.minutes}分
                    </p>
                  )}
                  {isOnBreak() && (
                    <p className="text-xs text-orange-600 mt-1 font-medium">
                      🍵 休憩中
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* 休憩ボタン */}
            <div className="grid grid-cols-2 gap-3">
              {!isOnBreak() ? (
                <button
                  onClick={handleBreakStart}
                  disabled={actionLoading}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:bg-gray-400"
                >
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      休憩開始
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleBreakEnd}
                  disabled={actionLoading}
                  className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
                >
                  {actionLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      処理中...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      休憩終了
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleClockOut}
                disabled={actionLoading}
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:bg-gray-400"
              >
                {actionLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    処理中...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    退勤する
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
