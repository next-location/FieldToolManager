import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import OrganizationDetailTabs from '@/components/admin/OrganizationDetailTabs';
import DeleteOrganizationButton from '@/components/admin/DeleteOrganizationButton';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
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

  // ユーザー数を取得
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  // 契約情報を取得
  const { data: activeContract } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', id)
    .eq('status', 'active')
    .maybeSingle();

  // 変更履歴を取得
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', id)
    .eq('entity_type', 'organization')
    .order('created_at', { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Link href="/admin/organizations" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block">
              ← 組織一覧に戻る
            </Link>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">組織詳細</h1>
              <div className="flex gap-3">
                <Link
                  href={`/admin/organizations/${id}/edit`}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  編集
                </Link>
                <DeleteOrganizationButton organizationId={id} />
              </div>
            </div>
          </div>

          <OrganizationDetailTabs
            organization={organization}
            userCount={userCount || 0}
            activeContract={activeContract}
            auditLogs={auditLogs || []}
          />
        </main>
      </div>
    </div>
  );
}
