import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import SalesDashboard from '@/components/admin/SalesDashboard';
import { salesStatusLabels } from '@/lib/constants/sales-status';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SalesPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // 営業ステータス別の件数を取得
  const { data: statusCounts } = await supabase
    .from('organizations')
    .select('sales_status')
    .then(({ data }) => {
      const counts: Record<string, number> = {
        not_contacted: 0,
        appointment: 0,
        prospect: 0,
        proposal: 0,
        negotiation: 0,
        contracting: 0,
        contracted: 0,
        cancelled: 0,
        lost: 0,
        do_not_contact: 0,
      };

      data?.forEach((org) => {
        if (org.sales_status && counts[org.sales_status] !== undefined) {
          counts[org.sales_status]++;
        }
      });

      return { data: counts };
    });

  // 次回アポイントがある組織を取得（7日以内）
  const today = new Date();
  const sevenDaysLater = new Date(today);
  sevenDaysLater.setDate(today.getDate() + 7);

  const { data: upcomingAppointments } = await supabase
    .from('organizations')
    .select('id, name, next_appointment_date, sales_status, priority')
    .not('next_appointment_date', 'is', null)
    .gte('next_appointment_date', today.toISOString())
    .lte('next_appointment_date', sevenDaysLater.toISOString())
    .order('next_appointment_date', { ascending: true });

  // 商談中の組織（優先度順）
  const { data: activeDeals } = await supabase
    .from('organizations')
    .select('id, name, sales_status, priority, expected_contract_amount, next_appointment_date, last_contact_date')
    .in('sales_status', ['proposal', 'negotiation', 'contracting'])
    .order('priority', { ascending: false })
    .order('expected_contract_amount', { ascending: false })
    .limit(10);

  // 最近の営業活動（直近10件）
  const { data: recentActivities } = await supabase
    .from('sales_activities')
    .select(`
      id,
      activity_type,
      title,
      description,
      created_at,
      created_by_name,
      organization_id,
      organizations (name)
    `)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">営業管理ダッシュボード</h1>
            <p className="text-sm text-gray-500 mt-1">営業案件の進捗状況と次回アポイントを管理</p>
          </div>

          <SalesDashboard
            statusCounts={statusCounts || {}}
            upcomingAppointments={upcomingAppointments || []}
            activeDeals={activeDeals || []}
            recentActivities={recentActivities || []}
          />
        </main>
      </div>
    </div>
  );
}
