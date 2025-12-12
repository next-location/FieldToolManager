import { Metadata } from 'next';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import InvoiceListView from '@/components/admin/InvoiceListView';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

export const metadata: Metadata = {
  title: '請求書管理 | システム管理',
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const params = await searchParams;
  const page = typeof params.page === 'string' ? parseInt(params.page) : 1;
  const status = typeof params.status === 'string' ? params.status : undefined;
  const organizationId = typeof params.organization_id === 'string' ? params.organization_id : undefined;

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
        <main className="flex-1 overflow-y-auto">
          <InvoiceListView
            initialPage={page}
            initialStatus={status}
            initialOrganizationId={organizationId}
          />
        </main>
      </div>
    </div>
  );
}
