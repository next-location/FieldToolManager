import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import ManufacturersList from '@/components/admin/ManufacturersList';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ManufacturersPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // メーカー一覧取得
  const { data: manufacturers } = await supabase
    .from('tool_manufacturers')
    .select('*')
    .is('deleted_at', null)
    .order('is_system_common', { ascending: false })
    .order('name');

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
              <h1 className="text-2xl font-bold text-gray-900">メーカーマスタ管理</h1>
              <p className="text-sm text-gray-600 mt-2">
                道具メーカーの登録・編集・削除を行います。
              </p>
            </div>

            <ManufacturersList manufacturers={manufacturers || []} />
          </div>
        </main>
      </div>
    </div>
  );
}
