import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import SuperAdminList from '@/components/admin/SuperAdminList';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SuperAdminsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Owner権限チェック
  const { data: adminData } = await supabase
    .from('super_admins')
    .select('role')
    .eq('id', session.id)
    .single();

  if (adminData?.role !== 'owner') {
    // Ownerのみアクセス可能
    redirect('/admin');
  }

  // Super Admin一覧を取得
  const { data: admins, error } = await supabase
    .from('super_admins')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching super admins:', error);
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
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">管理者アカウント管理</h1>
              <p className="text-sm text-gray-600 mt-2">
                Super Adminアカウントの追加・管理（オーナー専用）
              </p>
            </div>

            <SuperAdminList admins={admins || []} currentUserId={session.id} />
          </div>
        </main>
      </div>
    </div>
  );
}
