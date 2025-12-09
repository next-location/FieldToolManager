import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import OrganizationForm from '@/components/admin/OrganizationForm';

export default async function NewOrganizationPage() {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

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
            <h1 className="text-2xl font-bold text-gray-900">新規組織登録</h1>
          </div>
          <OrganizationForm mode="create" />
        </main>
      </div>
    </div>
  );
}
