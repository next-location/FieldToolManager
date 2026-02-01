'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AttendanceQuickActionProps {
  type: 'clock-in' | 'clock-out'
}

export function AttendanceQuickAction({ type }: AttendanceQuickActionProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const endpoint = type === 'clock-in' ? '/api/attendance/clock-in' : '/api/attendance/clock-out'

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_type: 'office',
          method: 'manual',
          device_type: 'desktop'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `${type === 'clock-in' ? '出勤' : '退勤'}打刻に失敗しました`)
      }

      // Show success message and refresh
      const message = type === 'clock-in' ? '出勤打刻しました' : '退勤打刻しました'
      alert(message) // In production, use a toast notification

      // Refresh the page to update the dashboard
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg transition-all transform active:scale-95
          px-6 py-4 text-lg min-h-[60px] sm:min-h-[56px]
          ${type === 'clock-in'
            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span className="text-xl sm:text-2xl mr-2" aria-hidden="true">
          {type === 'clock-in' ? '⏰' : '🚪'}
        </span>
        <span className="text-sm sm:text-base">
          {isLoading ? '処理中...' : type === 'clock-in' ? '出勤打刻' : '退勤打刻'}
        </span>
      </button>
      {error && (
        <div className="mt-2 text-red-600 text-sm">{error}</div>
      )}
    </>
  )
}