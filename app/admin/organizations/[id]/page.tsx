import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function OrganizationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // 組織データを取得
  const { data: organization, error } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !organization) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminHeader userName={session.name} />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <AdminSidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold mb-2">組織が見つかりません</p>
              <Link href="/admin/organizations" className="text-blue-600 hover:text-blue-700">
                組織一覧に戻る
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // ユーザー数を取得
  const { count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', id);

  // 契約情報を取得
  const { data: activeContract } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', id)
    .eq('status', 'active')
    .maybeSingle();

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Link href="/admin/organizations" className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block">
              ← 組織一覧に戻る
            </Link>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">組織詳細</h1>
              <Link
                href={`/admin/organizations/${id}/edit`}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                編集
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            {/* 基本情報カード */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{organization.name}</h2>
                    <p className="text-sm text-gray-500">サブドメイン: <span className="font-mono font-semibold">{organization.subdomain || '-'}</span></p>
                  </div>
                  <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${organization.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {organization.is_active ? '有効' : '無効'}
                  </span>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 基本情報 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">基本情報</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="text-gray-600 w-32">組織名:</dt>
                      <dd className="text-gray-900 font-medium">{organization.name}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">サブドメイン:</dt>
                      <dd className="text-gray-900 font-mono">{organization.subdomain || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">ユーザー数:</dt>
                      <dd className="text-gray-900">{userCount || 0}名</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">登録日:</dt>
                      <dd className="text-gray-900">{formatDate(organization.created_at)}</dd>
                    </div>
                  </dl>
                </div>

                {/* 連絡先情報 */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">連絡先情報</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex">
                      <dt className="text-gray-600 w-32">電話番号:</dt>
                      <dd className="text-gray-900">{organization.phone || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">FAX:</dt>
                      <dd className="text-gray-900">{organization.fax || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">郵便番号:</dt>
                      <dd className="text-gray-900">{organization.postal_code || '-'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">住所:</dt>
                      <dd className="text-gray-900">{organization.address || '-'}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>

            {/* 請求情報カード */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">請求情報</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex">
                  <dt className="text-gray-600 w-32">担当者名:</dt>
                  <dd className="text-gray-900">{organization.billing_contact_name || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="text-gray-600 w-32">メール:</dt>
                  <dd className="text-gray-900">{organization.billing_contact_email || '-'}</dd>
                </div>
                <div className="flex">
                  <dt className="text-gray-600 w-32">電話番号:</dt>
                  <dd className="text-gray-900">{organization.billing_contact_phone || '-'}</dd>
                </div>
                <div className="flex md:col-span-2">
                  <dt className="text-gray-600 w-32">請求先住所:</dt>
                  <dd className="text-gray-900">{organization.billing_address || '-'}</dd>
                </div>
              </dl>
            </div>

            {/* 契約情報カード */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">契約情報</h3>
              {activeContract ? (
                <div>
                  <div className="mb-4">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      契約中
                    </span>
                  </div>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex">
                      <dt className="text-gray-600 w-32">契約番号:</dt>
                      <dd className="text-gray-900 font-mono">{activeContract.contract_number}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">契約タイプ:</dt>
                      <dd className="text-gray-900">{activeContract.contract_type === 'monthly' ? '月契約' : '年契約'}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">契約開始日:</dt>
                      <dd className="text-gray-900">{formatDate(activeContract.start_date)}</dd>
                    </div>
                    <div className="flex">
                      <dt className="text-gray-600 w-32">月額料金:</dt>
                      <dd className="text-gray-900 font-semibold text-blue-600">¥{activeContract.total_monthly_fee.toLocaleString()}</dd>
                    </div>
                  </dl>
                  <div className="mt-4">
                    <Link
                      href={`/admin/contracts/${activeContract.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      契約詳細を見る →
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 mb-3">
                    契約なし
                  </span>
                  <p className="text-gray-500 text-sm">現在有効な契約はありません</p>
                </div>
              )}
            </div>

            {/* メタ情報カード */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">メタ情報</h3>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <dt className="text-gray-500 mb-1">組織ID:</dt>
                  <dd className="text-gray-700 font-mono text-xs break-all">{organization.id}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">作成日時:</dt>
                  <dd className="text-gray-700">{formatDate(organization.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-gray-500 mb-1">更新日時:</dt>
                  <dd className="text-gray-700">{formatDate(organization.updated_at)}</dd>
                </div>
              </dl>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
