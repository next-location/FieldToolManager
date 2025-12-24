import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import OrganizationsTable from '@/components/admin/OrganizationsTable';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function OrganizationsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // 組織データを取得（マスタ情報として必要な項目）
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      subdomain,
      is_active,
      created_at
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching organizations:', error);
  }

  // 各組織のユーザー数と契約有無を取得
  const organizationsWithCounts = await Promise.all(
    (organizations || []).map(async (org) => {
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      const { data: activeContract } = await supabase
        .from('contracts')
        .select('id')
        .eq('organization_id', org.id)
        .eq('status', 'active')
        .maybeSingle();

      return {
        ...org,
        user_count: userCount || 0,
        has_active_contract: activeContract !== null,
      };
    })
  );

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
          {/* タイトルと新規組織ボタン */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">組織管理</h1>
            <Link
              href="/admin/organizations/new"
              className="px-4 py-2 bg-[#1E6FFF] text-white rounded-lg hover:bg-[#0D4FCC] transition-colors"
            >
              + 新規組織
            </Link>
          </div>

          {/* フィルター付きテーブル */}
          <OrganizationsTable initialOrganizations={organizationsWithCounts || []} />
        </main>
      </div>
    </div>
  );
}
