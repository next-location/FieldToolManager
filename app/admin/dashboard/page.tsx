import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function AdminDashboardPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // 統計情報を取得
  const [organizationsResult, contractsResult, usersResult, packagesResult, salesActivitiesResult] = await Promise.all([
    supabase.from('organizations').select('id, sales_status', { count: 'exact' }),
    supabase.from('contracts').select('id, status, total_monthly_fee', { count: 'exact' }),
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('packages').select('id', { count: 'exact', head: true }),
    supabase.from('sales_activities').select('id, created_at').order('created_at', { ascending: false }).limit(5),
  ]);

  const totalOrganizations = organizationsResult.count || 0;
  const activeOrganizations = organizationsResult.data?.filter(o => o.sales_status === 'contracted').length || 0;
  const prospectOrganizations = organizationsResult.data?.filter(o => ['lead', 'contact', 'proposal', 'negotiation'].includes(o.sales_status || '')).length || 0;

  const allContracts = contractsResult.data || [];
  const activeContracts = allContracts.filter(c => c.status === 'active').length;
  const draftContracts = allContracts.filter(c => c.status === 'draft').length;
  const totalMRR = allContracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.total_monthly_fee || 0), 0);

  const totalUsers = usersResult.count || 0;
  const totalPackages = packagesResult.count || 0;
  const recentActivities = salesActivitiesResult.data || [];

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">ダッシュボード</h1>

        {/* 統計カード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* 組織数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総組織数</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{totalOrganizations}</p>
                <p className="text-xs text-gray-500 mt-1">契約中: {activeOrganizations} / 見込み: {prospectOrganizations}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          {/* 有効契約 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">有効契約</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{activeContracts}</p>
                <p className="text-xs text-gray-500 mt-1">準備中: {draftContracts}件</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* MRR */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">月次経常収益（MRR）</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">¥{totalMRR.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">ARR: ¥{(totalMRR * 12).toLocaleString()}</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 総ユーザー数 */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">総ユーザー数</p>
                <p className="text-3xl font-bold text-orange-600 mt-2">{totalUsers}</p>
                <p className="text-xs text-gray-500 mt-1">パッケージ数: {totalPackages}</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* クイックアクセス */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 最近の営業活動 */}
          <div className="bg-white rounded-lg shadow p-6 col-span-2">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 最近の営業活動</h3>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity) => (
                  <div key={activity.id} className="flex items-center text-sm text-gray-600 border-l-2 border-blue-500 pl-3">
                    <span className="text-gray-500">{new Date(activity.created_at).toLocaleString('ja-JP')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">まだ営業活動がありません</p>
            )}
          </div>

          {/* クイックリンク */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔗 クイックリンク</h3>
            <div className="space-y-2">
              <a href="/admin/contracts/new" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                + 新規契約作成
              </a>
              <a href="/admin/organizations/new" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                + 新規組織追加
              </a>
              <a href="/admin/packages" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                パッケージ設定
              </a>
              <a href="/admin/analytics" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                売上分析を見る
              </a>
              <a href="/admin/logs" className="block text-sm text-blue-600 hover:text-blue-800 hover:underline">
                操作ログを見る
              </a>
            </div>
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}
