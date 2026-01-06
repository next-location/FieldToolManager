import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import EditContractForm from '@/components/admin/EditContractForm';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
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
        subdomain,
        address,
        billing_contact_name,
        billing_contact_email,
        billing_contact_phone,
        billing_address
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

  // draft以外は編集不可
  if (contract.status !== 'draft') {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminHeader userName={session.name} />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <AdminSidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
              <p className="text-yellow-800 font-semibold mb-2">編集できません</p>
              <p className="text-gray-600 text-sm mb-4">draft状態の契約のみ編集可能です。</p>
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

  // 契約パッケージ情報を取得
  const { data: contractPackagesRaw } = await supabase
    .from('contract_packages')
    .select(`
      package_id,
      packages (
        id,
        name,
        package_key
      )
    `)
    .eq('contract_id', id);

  // 型を修正（packages配列を単一オブジェクトに変換）
  const contractPackages = contractPackagesRaw?.map((cp: any) => ({
    package_id: cp.package_id,
    packages: Array.isArray(cp.packages) ? cp.packages[0] : cp.packages,
  })) || [];

  // パッケージ一覧を取得
  const { data: packages } = await supabase
    .from('packages')
    .select(`
      *,
      features:package_features(*)
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl">
            <Link
              href={`/admin/contracts/${id}`}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block"
            >
              ← 契約詳細に戻る
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mb-6">契約編集</h1>
            <EditContractForm
              contract={contract}
              contractPackages={contractPackages || []}
              packages={packages || []}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
