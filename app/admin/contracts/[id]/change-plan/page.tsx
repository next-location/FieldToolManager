import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import PlanChangeForm from '@/components/admin/PlanChangeForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function PlanChangePage({ params }: { params: Promise<{ id: string }> }) {
  // 認証チェック
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // 契約データを取得
  const { data: contract, error } = await supabase
    .from('contracts')
    .select(`
      *,
      organizations (
        id,
        name,
        subdomain
      )
    `)
    .eq('id', id)
    .single();

  if (error || !contract) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminHeader userName={session.name} />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <AdminSidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold mb-2">契約が見つかりません</p>
              <Link
                href="/admin/contracts"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                契約一覧に戻る
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // activeステータスのみプラン変更可能
  if (contract.status !== 'active') {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminHeader userName={session.name} />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <AdminSidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-600 font-semibold mb-2">プラン変更できません</p>
              <p className="text-gray-600 text-sm mb-4">契約が有効状態(active)ではありません。</p>
              <Link
                href={`/admin/contracts/${id}`}
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                契約詳細に戻る
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 現在の契約パッケージを取得
  const { data: currentPackagesRaw } = await supabase
    .from('contract_packages')
    .select(`
      package_id,
      packages (
        id,
        name,
        package_key,
        monthly_fee
      )
    `)
    .eq('contract_id', id);

  // 型変換（packagesは配列で返される可能性があるため、最初の要素を取得）
  const currentPackages = currentPackagesRaw?.map(cp => ({
    package_id: cp.package_id,
    packages: Array.isArray(cp.packages) ? cp.packages[0] : cp.packages
  })) || [];

  // 利用可能なパッケージを取得
  const { data: availablePackages } = await supabase
    .from('packages')
    .select('*')
    .order('display_order');

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Link
              href={`/admin/contracts/${id}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block"
            >
              ← 契約詳細に戻る
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">プラン変更</h1>
            <p className="text-gray-600 mt-2">
              {contract.organizations?.name} - 契約番号: {contract.contract_number}
            </p>
          </div>

          <PlanChangeForm
            contract={contract}
            currentPackages={currentPackages}
            availablePackages={availablePackages || []}
          />
        </main>
      </div>
    </div>
  );
}
