import React from 'react';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import SuperAdminNotifications from '@/components/admin/SuperAdminNotifications';

export default async function NotificationsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <AdminHeader userName={session.name} />

      {/* サイドバーとメインコンテンツ */}
      <div className="flex flex-1 overflow-hidden">
        {/* サイドバー */}
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>

        {/* メインコンテンツ */}
        <main className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">通知管理</h1>

          <div className="mb-6">
            <p className="text-sm text-gray-600">
              システムの重要な通知を表示しています
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Resend使用量アラート、契約通知、システムエラーなど
            </p>
          </div>

          {/* 通知一覧 */}
          <SuperAdminNotifications />
        </main>
      </div>
    </div>
  );
}
