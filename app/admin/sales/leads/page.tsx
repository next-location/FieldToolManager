import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import SalesLeadsList from '@/components/admin/SalesLeadsList';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SalesLeadsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Supabase Clientを使用（組織一覧ページと同じ方法）
  // テスト：sales_statusカラムが認識されるか確認
  const { data: organizations, error: orgsError } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      subdomain,
      sales_status,
      priority,
      expected_contract_amount,
      next_appointment_date,
      last_contact_date,
      lead_source,
      phone,
      address,
      is_active,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (orgsError) {
    console.error('[Sales Leads] Supabase Error:', orgsError);
  }

  console.log('[Sales Leads] Organizations:', organizations);
  console.log('[Sales Leads] Error:', orgsError);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">営業案件一覧</h1>
            <p className="text-sm text-gray-500 mt-1">全ての営業案件を一覧で管理</p>
          </div>

          {/* デバッグ情報 */}
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="font-bold">デバッグ情報:</p>
            <p>組織データ: {organizations ? JSON.stringify(organizations) : 'null'}</p>
            <p>エラー: {orgsError ? JSON.stringify(orgsError) : 'なし'}</p>
            <p>組織数: {organizations?.length || 0}</p>
          </div>

          <SalesLeadsList organizations={organizations || []} />
        </main>
      </div>
    </div>
  );
}
