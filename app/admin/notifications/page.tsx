import React from 'react';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function NotificationsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // 重要な操作ログを通知として取得
  const { data: logs } = await supabase
    .from('super_admin_logs')
    .select('*')
    .in('action', ['create_contract', 'complete_contract', 'create_organization', 'create_super_admin'])
    .order('created_at', { ascending: false })
    .limit(20);

  // ログを通知形式に変換
  const notifications = (logs || []).map((log: any) => {
    let title = '';
    let message = '';
    let type = 'info';

    const details = log.details || {};

    switch (log.action) {
      case 'create_contract':
      case 'create_contract_draft':
        title = '新規契約が作成されました';
        message = `組織: ${details.organization_name || '不明'} / プラン: ${details.plan_name || '不明'}`;
        type = 'info';
        break;
      case 'complete_contract':
        title = '契約が完了しました';
        message = `組織: ${details.organization_name || '不明'} / 契約ID: ${details.contract_id || '不明'}`;
        type = 'success';
        break;
      case 'create_organization':
        title = '新規組織が登録されました';
        message = `組織名: ${details.name || '不明'} / 業種: ${details.industry || '不明'}`;
        type = 'info';
        break;
      case 'create_super_admin':
        title = '新しい管理者が追加されました';
        message = `名前: ${details.name || '不明'} / メール: ${details.email || '不明'} / 権限: ${details.role === 'owner' ? 'オーナー' : '営業'}`;
        type = 'warning';
        break;
      default:
        title = log.action;
        message = details ? Object.entries(details).map(([k, v]) => `${k}: ${v}`).join(' / ') : '詳細なし';
        type = 'info';
    }

    return {
      id: log.id,
      title,
      message,
      type,
      createdAt: new Date(log.created_at),
      isRead: true, // ログは全て既読扱い
    };
  });

  const typeColors: Record<string, string> = {
    info: 'bg-blue-100 text-blue-800',
    warning: 'bg-yellow-100 text-yellow-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
  };

  const typeIcons: Record<string, React.ReactElement> = {
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
    success: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
  };

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
              最近の重要な操作を表示しています（最大20件）
            </p>
            <p className="text-xs text-gray-500 mt-1">
              全ての操作履歴は「操作ログ」ページで確認できます
            </p>
          </div>

          {/* 通知一覧 */}
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white rounded-lg shadow p-4 ${!notification.isRead ? 'border-l-4 border-[#1E6FFF]' : ''}`}
              >
                <div className="flex items-start space-x-4">
                  <div className={`p-2 rounded-lg ${typeColors[notification.type]}`}>
                    {typeIcons[notification.type]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {notification.title}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <span className="px-2 py-1 text-xs font-medium text-white bg-[#1E6FFF] rounded-full">
                          未読
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <p className="text-xs text-gray-500">
                        {notification.createdAt.toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {notifications.length === 0 && (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p className="mt-4 text-sm text-gray-500">通知はありません</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
