import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import ContractDetailView from '@/components/admin/ContractDetailView';
import CompleteContractButton from '@/components/admin/CompleteContractButton';
import CreateContractDocumentButton from '@/components/admin/CreateContractDocumentButton';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // 認証チェック
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  console.log('[Contract Detail] Fetching contract with ID:', id);

  // 契約データを取得（組織情報も含む）
  const { data: contract, error } = await supabase
    .from('contracts')
    .select(`
      *,
      organizations (
        id,
        name,
        subdomain,
        billing_contact_name,
        billing_contact_email,
        billing_contact_phone,
        billing_address
      )
    `)
    .eq('id', id)
    .single();

  console.log('[Contract Detail] Query result:', { contract, error });

  // 契約パッケージ情報を取得
  const { data: contractPackages } = await supabase
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

  console.log('[Contract Detail] Contract packages:', contractPackages);

  // 請求書データを取得（契約IDで絞り込み）
  const { data: invoices, error: invoicesError } = await supabase
    .from('invoices')
    .select('*')
    .eq('contract_id', id)
    .order('billing_period_start', { ascending: false });

  console.log('[Contract Detail] Invoices result:', { invoices, invoicesError });

  // 初回請求書を取得
  const { data: initialInvoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, total_amount')
    .eq('contract_id', id)
    .eq('is_initial_invoice', true)
    .single();

  console.log('[Contract Detail] Initial invoice:', initialInvoice);

  if (error || !contract) {
    console.log('[Contract Detail] Contract not found or error:', error);
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold mb-2">契約が見つかりません</p>
              <p className="text-gray-600 text-sm mb-4">指定された契約IDが存在しないか、アクセス権限がありません。</p>
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
          {/* ヘッダー */}
          <div className="mb-6">
            <Link
              href="/admin/contracts"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block"
            >
              ← 契約一覧に戻る
            </Link>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">契約詳細</h1>
              <div className="flex gap-3">
                {contract.status === 'draft' && (
                  <>
                    <CreateContractDocumentButton contract={contract} />
                    <CompleteContractButton
                      contractId={contract.id}
                      contractNumber={contract.contract_number}
                    />
                  </>
                )}
                {contract.status === 'active' && (
                  <div className="text-sm text-gray-600 flex items-center">
                    <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    契約完了済み
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 契約詳細ビュー */}
          <ContractDetailView
            contract={contract}
            invoices={invoices || []}
            contractPackages={contractPackages || []}
            initialInvoice={initialInvoice || null}
          />
        </main>
      </div>
    </div>
  );
}
