import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import ContractsTable from '@/components/admin/ContractsTable';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Super Admin の権限を取得
  const { data: adminData } = await supabase
    .from('super_admins')
    .select('role')
    .eq('id', session.id)
    .single();

  const userRole = adminData?.role || 'sales';
  const isOwner = userRole === 'owner';

  // 契約データを取得（機能パック情報を含む）
  const { data: contractsData, error } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      plan,
      status,
      start_date,
      monthly_fee,
      has_asset_package,
      has_dx_efficiency_package,
      organizations (
        id,
        name,
        subdomain
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching contracts:', error);
  }

  // Supabaseの戻り値を変換（organizationsは配列で返ってくるが、最初の要素のみ使用）
  const contracts = contractsData?.map(contract => {
    console.log('[Contracts Page] Raw contract organizations:', contract.organizations);
    return {
      ...contract,
      organizations: Array.isArray(contract.organizations) && contract.organizations.length > 0
        ? contract.organizations[0]
        : null
    };
  }) || [];

  console.log('[Contracts Page] Transformed contracts:', contracts.length, 'items');

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
          {/* タイトルと新規契約ボタン */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">契約管理</h1>
            {isOwner ? (
              <Link
                href="/admin/contracts/new"
                className="px-4 py-2 bg-[#1E6FFF] text-white rounded-lg hover:bg-[#0D4FCC] transition-colors"
              >
                + 新規契約
              </Link>
            ) : (
              <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                + 新規契約（閲覧のみ）
              </div>
            )}
          </div>

          {!isOwner && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-700">
                📌 営業ロールでは契約の作成・編集・削除はできません。閲覧のみ可能です。
              </p>
            </div>
          )}

          {/* フィルター付きテーブル */}
          <ContractsTable initialContracts={contracts || []} />
        </main>
      </div>
    </div>
  );
}
