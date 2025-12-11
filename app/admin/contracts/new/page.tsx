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
  let query = supabase
    .from('organizations')
    .select('id, name, subdomain, address, billing_contact_name, billing_contact_email, billing_contact_phone, billing_address');

  // activeOrgIdsが空でない場合のみ除外条件を追加
  if (activeOrgIds.length > 0) {
    query = query.not('id', 'in', `(${activeOrgIds.join(',')})`);
  }

  const { data: organizations, error } = await query.order('name', { ascending: true });

  if (error) {
    console.error('Error fetching organizations:', error);
  }

  // パッケージ一覧を取得
  const { data: packages, error: packagesError } = await supabase
    .from('packages')
    .select(`
      *,
      features:package_features(*)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (packagesError) {
    console.error('Error fetching packages:', packagesError);
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
            <NewContractForm
              organizations={organizations || []}
              packages={packages || []}
              superAdminId={session.id}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
