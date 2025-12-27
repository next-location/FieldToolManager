'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
}

export default function SuperAdminNotifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      const res = await fetch('/api/admin/notifications', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      const res = await fetch(`/api/admin/notifications/${id}/read`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        setNotifications(notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        ));
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  }

  const severityColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    critical: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const severityIcons: Record<string, React.ReactElement> = {
    info: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    critical: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`bg-white rounded-lg shadow border-l-4 p-4 ${
            !notification.is_read ? 'border-l-blue-500' : 'border-l-gray-300'
          }`}
        >
          <div className="flex items-start space-x-4">
            <div className={`p-2 rounded-lg ${severityColors[notification.severity]}`}>
              {severityIcons[notification.severity]}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {notification.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">
                    {notification.message}
                  </p>
                  {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {notification.metadata.yearMonth && (
                        <span>対象月: {notification.metadata.yearMonth} | </span>
                      )}
                      {notification.metadata.monthlyCount && (
                        <span>送信数: {notification.metadata.monthlyCount}通 | </span>
                      )}
                      {notification.metadata.usagePercentage && (
                        <span>使用率: {notification.metadata.usagePercentage}%</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.is_read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                    >
                      既読にする
                    </button>
                  )}
                  {notification.is_read && (
                    <span className="px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded">
                      既読
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-xs text-gray-500">
                  {new Date(notification.created_at).toLocaleString('ja-JP')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}

      {notifications.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <p className="mt-4 text-sm text-gray-500">通知はありません</p>
        </div>
      )}
    </div>
  );
}
