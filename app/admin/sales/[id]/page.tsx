import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import SalesLeadDetail from '@/components/admin/SalesLeadDetail';
import Link from 'next/link';

// 動的レンダリングを強制（キャッシュ無効化）
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SalesLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // 組織の営業情報を取得
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
              <Link href="/admin/sales/leads" className="text-blue-600 hover:text-blue-700">
                営業案件一覧に戻る
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 営業活動履歴を取得
  const { data: activities } = await supabase
    .from('sales_activities')
    .select('*')
    .eq('organization_id', id)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Link href="/admin/sales/leads" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block">
              ← 営業案件一覧に戻る
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
            <p className="text-sm text-gray-500 mt-1">営業案件詳細</p>
          </div>

          <SalesLeadDetail
            organization={organization}
            activities={activities || []}
            superAdminId={session.id}
            superAdminName={session.name}
          />
        </main>
      </div>
    </div>
  );
}
