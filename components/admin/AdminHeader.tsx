'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

interface AdminHeaderProps {
  userName: string;
}

export default function AdminHeader({ userName }: AdminHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  // 未読通知数を取得
  useEffect(() => {
    async function fetchUnreadCount() {
      try {
        const res = await fetch('/api/admin/notifications/unread-count', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error('[AdminHeader] Failed to fetch unread count:', error);
      }
    }

    fetchUnreadCount();

    // 30秒ごとに更新
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 h-16">
      <div className="h-full px-6 flex items-center justify-between">
        {/* ロゴ */}
        <div className="flex items-center">
          <Image
            src="/images/zairoku-logo-02.png"
            alt="ザイロク"
            width={120}
            height={36}
            priority
          />
        </div>

        {/* 右側メニュー */}
        <div className="flex items-center space-x-4">
          {/* 通知アイコン */}
          <Link
            href="/admin/notifications"
            className="relative p-2 text-gray-600 hover:text-[#1E6FFF] hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {/* 未読バッジ */}
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>

          {/* ユーザー情報 */}
          <div className="flex items-center space-x-3 pl-3 border-l border-gray-200">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{userName}</p>
              <p className="text-xs text-gray-500">システム管理者</p>
            </div>
            <form action="/api/admin/logout" method="POST">
              <button
                type="submit"
                className="px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
              >
                ログアウト
              </button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
