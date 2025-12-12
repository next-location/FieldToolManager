import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CSVImportClient } from './CSVImportClient'

export default async function CSVImportPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    redirect('/')
  }

  // カテゴリ一覧を取得
  const { data: categories } = await supabase
    .from('tool_categories')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <CSVImportClient
          categories={categories || []}
          organizationId={userData?.organization_id}
        />
      </div>
    </div>
  )
}
