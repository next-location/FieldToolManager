import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import SystemSettingsForm from '@/components/admin/SystemSettingsForm';

export default async function SystemSettingsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // オーナーのみアクセス可能
  if (session.role !== 'owner') {
    redirect('/admin/dashboard');
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
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">システム設定</h1>
            <p className="text-sm text-gray-600 mb-6">
              システム全体の設定を管理します
            </p>

            <SystemSettingsForm />
          </div>
        </main>
      </div>
    </div>
  );
}
