'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'

interface SessionTimeoutMonitorProps {
  timeoutMinutes?: number
  warningMinutes?: number
  organizationId?: string
}

export default function SessionTimeoutMonitor({
  timeoutMinutes = 30,
  warningMinutes = 5,
  organizationId,
}: SessionTimeoutMonitorProps) {
  console.log('[SessionTimeoutMonitor] Component mounted/rendered')
  const router = useRouter()
  const [showWarning, setShowWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const lastActivityRef = useRef(Date.now())
  const warningShownRef = useRef(false)
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null)
  const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null)

  // セキュリティ設定を取得
  useEffect(() => {
    console.log('[SessionTimeoutMonitor] Initializing with organizationId:', organizationId)
    if (organizationId) {
      fetch(`/api/security/settings?organization_id=${organizationId}`, {
        credentials: 'include',
      })
        .then((res) => res.json())
        .then((data) => {
          console.log('[SessionTimeoutMonitor] Fetched security settings:', data)
          if (data.sessionTimeoutMinutes) {
            console.log('[SessionTimeoutMonitor] Setting timeout to:', data.sessionTimeoutMinutes, 'minutes')
            // タイムアウト時間を更新
            resetTimer(data.sessionTimeoutMinutes)
          } else {
            console.log('[SessionTimeoutMonitor] No sessionTimeoutMinutes found, using default:', timeoutMinutes)
            resetTimer(timeoutMinutes)
          }
        })
        .catch((err) => {
          console.error('[SessionTimeoutMonitor] Failed to fetch security settings:', err)
          resetTimer(timeoutMinutes)
        })
    } else {
      console.log('[SessionTimeoutMonitor] No organizationId, using default timeout:', timeoutMinutes)
      resetTimer(timeoutMinutes)
    }
  }, [organizationId])

  const resetTimer = (timeout: number = timeoutMinutes) => {
    console.log('[SessionTimeoutMonitor] resetTimer called with timeout:', timeout, 'minutes')
    lastActivityRef.current = Date.now()
    warningShownRef.current = false
    setShowWarning(false)

    // 既存のタイマーをクリア
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current)
    }
    if (warningTimeoutIdRef.current) {
      clearTimeout(warningTimeoutIdRef.current)
    }

    // 警告タイマーを設定
    // タイムアウト時間が警告時間より短い場合は、タイムアウトの半分の時点で警告を表示
    const effectiveWarningMinutes = timeout > warningMinutes ? warningMinutes : timeout / 2
    const warningTime = (timeout - effectiveWarningMinutes) * 60 * 1000
    console.log('[SessionTimeoutMonitor] Warning will show in:', warningTime / 1000, 'seconds')

    if (warningTime > 0) {
      warningTimeoutIdRef.current = setTimeout(() => {
        if (!warningShownRef.current) {
          console.log('[SessionTimeoutMonitor] Showing warning modal')
          setShowWarning(true)
          setRemainingTime(effectiveWarningMinutes * 60)
          warningShownRef.current = true
        }
      }, warningTime)
    }

    // セッションタイムアウトタイマーを設定
    const timeoutTime = timeout * 60 * 1000
    console.log('[SessionTimeoutMonitor] Auto logout will occur in:', timeoutTime / 1000, 'seconds')
    timeoutIdRef.current = setTimeout(() => {
      console.log('[SessionTimeoutMonitor] Timeout reached, logging out')
      handleTimeout()
    }, timeoutTime)
  }

  const handleTimeout = async () => {
    // ログアウト処理
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout error:', error)
    }

    // ログインページにリダイレクト
    router.push('/login?reason=timeout')
  }

  const extendSession = () => {
    resetTimer()
    setShowWarning(false)
  }

  // ユーザーアクティビティを監視
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click']

    const handleActivity = () => {
      const now = Date.now()
      const timeSinceLastActivity = now - lastActivityRef.current

      // 1分以上経過している場合のみタイマーをリセット
      if (timeSinceLastActivity > 60 * 1000) {
        console.log('[SessionTimeoutMonitor] User activity detected, resetting timer')
        resetTimer()
      }
    }

    console.log('[SessionTimeoutMonitor] Setting up activity listeners')
    events.forEach((event) => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      console.log('[SessionTimeoutMonitor] Cleaning up activity listeners')
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity)
      })

      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current)
      }
      if (warningTimeoutIdRef.current) {
        clearTimeout(warningTimeoutIdRef.current)
      }
    }
  }, [timeoutMinutes])

  // 残り時間のカウントダウン
  useEffect(() => {
    if (!showWarning) return

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [showWarning])

  if (!showWarning) return null

  const minutes = Math.floor(remainingTime / 60)
  const seconds = remainingTime % 60

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start gap-3">
          <AlertCircle className="h-6 w-6 flex-shrink-0 text-orange-500" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              セッションがまもなく終了します
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              セキュリティのため、一定時間操作がないとログアウトされます。
            </p>
          </div>
        </div>

        <div className="mb-6 rounded-lg bg-orange-50 p-4 text-center">
          <p className="text-sm text-gray-700">残り時間</p>
          <p className="text-3xl font-bold text-orange-600">
            {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={extendSession}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            セッションを延長
          </button>
          <button
            onClick={handleTimeout}
            className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
