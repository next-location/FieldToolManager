import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import CommonToolForm from '@/components/admin/CommonToolForm';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function EditCommonToolPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();

  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // 共通道具取得
  const { data: tool, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', id)
    .eq('is_system_common', true)
    .is('organization_id', null)
    .is('deleted_at', null)
    .single();

  if (error || !tool) {
    redirect('/admin/tools/common');
  }

  // カテゴリ一覧取得
  const { data: categories } = await supabase
    .from('tool_categories')
    .select('*')
    .order('name');

  // メーカー一覧取得
  const { data: manufacturers } = await supabase
    .from('tool_manufacturers')
    .select('*')
    .order('name');

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
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">共通道具マスタ編集</h1>
              <p className="text-sm text-gray-600 mt-2">
                共通道具「{tool.name}」の情報を編集します。
              </p>
            </div>

            <CommonToolForm
              categories={categories || []}
              manufacturers={manufacturers || []}
              tool={tool}
              isEdit={true}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
