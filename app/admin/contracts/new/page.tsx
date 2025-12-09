import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import NewContractForm from '@/components/admin/NewContractForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function NewContractPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // まずactive契約を持つ組織IDを取得
  const { data: activeContracts } = await supabase
    .from('contracts')
    .select('organization_id')
    .eq('status', 'active');

  const activeOrgIds = activeContracts?.map(c => c.organization_id) || [];

  // 組織一覧を取得（請求情報・住所も含む、既に契約中の組織を除外）
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select('id, name, subdomain, address, billing_contact_name, billing_contact_email, billing_contact_phone, billing_address')
    .not('id', 'in', `(${activeOrgIds.join(',') || 'null'})`)
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching organizations:', error);
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">新規契約作成</h1>
            <NewContractForm organizations={organizations || []} superAdminId={session.id} />
          </div>
        </main>
      </div>
    </div>
  );
}
