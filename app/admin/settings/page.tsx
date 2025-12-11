import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function SettingsPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  // Super Adminの権限情報を取得
  const { data: adminData } = await supabase
    .from('super_admins')
    .select('role, permission_level, email, name, created_at')
    .eq('id', session.id)
    .single();

  const userRole = adminData?.role || 'sales';

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">設定</h1>

          {/* アカウント情報 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">アカウント情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">名前</span>
                <span className="text-sm text-gray-900">{adminData?.name}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">メールアドレス</span>
                <span className="text-sm text-gray-900">{adminData?.email}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">権限レベル</span>
                <span className={`text-sm px-3 py-1 rounded-full ${
                  userRole === 'owner'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {userRole === 'owner' ? 'オーナー' : '営業'}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">アカウント作成日</span>
                <span className="text-sm text-gray-900">
                  {adminData?.created_at ? new Date(adminData.created_at).toLocaleDateString('ja-JP') : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* システム情報 */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">システム情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">システム名</span>
                <span className="text-sm text-gray-900">ザイロク 現場管理システム</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">バージョン</span>
                <span className="text-sm text-gray-900">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="text-sm font-medium text-gray-600">環境</span>
                <span className="text-sm text-gray-900">
                  {process.env.NODE_ENV === 'production' ? '本番環境' : '開発環境'}
                </span>
              </div>
            </div>
          </div>

          {/* クイックアクション */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userRole === 'owner' && (
                <>
                  <Link
                    href="/admin/admins"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-6 h-6 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">管理者アカウント管理</p>
                      <p className="text-xs text-gray-500">Super Adminの追加・編集</p>
                    </div>
                  </Link>
                  <Link
                    href="/admin/packages"
                    className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-6 h-6 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <div>
                      <p className="font-medium text-gray-900">パッケージ設定</p>
                      <p className="text-xs text-gray-500">機能パッケージの管理</p>
                    </div>
                  </Link>
                </>
              )}
              <Link
                href="/admin/logs"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">操作ログ</p>
                  <p className="text-xs text-gray-500">管理画面の操作履歴</p>
                </div>
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-6 h-6 text-orange-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">売上分析</p>
                  <p className="text-xs text-gray-500">MRR・ARR・契約状況</p>
                </div>
              </Link>
            </div>
          </div>

          {/* 今後の実装予定 */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">🚧 今後実装予定の機能</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• パスワード変更機能</li>
              <li>• 2段階認証（2FA）設定</li>
              <li>• 通知設定</li>
              <li>• システム環境設定（メール送信設定など）</li>
              <li>• バックアップ・復元機能</li>
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
