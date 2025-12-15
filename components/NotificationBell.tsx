'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface NotificationBellProps {
  organizationId: string
}

export function NotificationBell({ organizationId }: NotificationBellProps) {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUnreadCount()
    // 1分ごとに未読数を更新
    const interval = setInterval(fetchUnreadCount, 60000)

    // ページがフォーカスされたときに更新
    const handleFocus = () => {
      fetchUnreadCount()
    }
    window.addEventListener('focus', handleFocus)

    // visibilitychangeイベントでも更新（タブ切り替え時）
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCount()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 通知が既読になったときに即座に更新
    const handleNotificationRead = () => {
      fetchUnreadCount()
    }
    window.addEventListener('notificationRead', handleNotificationRead)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('notificationRead', handleNotificationRead)
    }
  }, [organizationId])

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count)
      } else if (response.status === 401) {
        // 認証エラーの場合はサイレントに処理（ログインページなどで表示される可能性があるため）
        setUnreadCount(0)
      }
    } catch (error) {
      // ネットワークエラーなどはサイレントに処理
      setUnreadCount(0)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
    >
      {/* ベルアイコン */}
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>

      {/* 未読バッジ */}
      {!isLoading && unreadCount > 0 && (
        <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-red-600 rounded-full min-w-[18px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
