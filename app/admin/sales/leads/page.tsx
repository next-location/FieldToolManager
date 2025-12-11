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

  // 全組織の営業情報を取得
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name, subdomain, sales_status, priority, expected_contract_amount, next_appointment_date, last_contact_date, lead_source, phone, address')
    .order('priority', { ascending: false })
    .order('next_appointment_date', { ascending: true });

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

          <SalesLeadsList organizations={organizations || []} />
        </main>
      </div>
    </div>
  );
}
