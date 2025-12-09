import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import OrganizationForm from '@/components/admin/OrganizationForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function EditOrganizationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // 組織データを取得
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !organization) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminHeader userName={session.name} />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <AdminSidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold mb-2">組織が見つかりません</p>
              <Link href="/admin/organizations" className="text-blue-600 hover:text-blue-700">
                組織一覧に戻る
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Link href={`/admin/organizations/${id}`} className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block">
              ← 組織詳細に戻る
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">組織編集</h1>
          </div>
          <OrganizationForm mode="edit" initialData={organization} />
        </main>
      </div>
    </div>
  );
}
