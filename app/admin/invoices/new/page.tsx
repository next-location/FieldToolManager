import { Metadata } from 'next';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import CreateInvoiceForm from '@/components/admin/CreateInvoiceForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const metadata: Metadata = {
  title: '請求書作成 | システム管理',
};

export default async function NewInvoicePage() {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  // 有効な契約を取得
  const { data: contracts } = await supabase
    .from('contracts')
    .select(`
      id,
      contract_number,
      monthly_fee,
      organizations (
        id,
        name
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

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
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">請求書作成</h1>
            <CreateInvoiceForm contracts={contracts || []} />
          </div>
        </main>
      </div>
    </div>
  );
}
