import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { CSVImportClient } from './CSVImportClient'

export default async function CSVImportPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー情報を取得

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userRole)) {
    redirect('/')
  }

  // カテゴリ一覧を取得
  const { data: categories } = await supabase
    .from('tool_categories')
    .select('id, name')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <CSVImportClient
          categories={categories || []}
          organizationId={organizationId}
        />
      </div>
    </div>
  )
}
