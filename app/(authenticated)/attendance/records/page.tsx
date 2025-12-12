import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AttendanceRecordsWrapper } from './AttendanceRecordsWrapper'

export default async function AttendanceRecordsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('id', user.id)
    .single()

  // admin/manager権限チェック
  if (!userData || !['admin', 'manager'].includes(userData.role)) {
    redirect('/')
  }

  // 組織情報取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', userData?.organization_id)
    .single()

  // スタッフ一覧取得（フィルター用）
  const { data: staffList } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 現場一覧取得（フィルター用）
  const { data: sitesList } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">勤怠一覧</h1>
          <p className="mt-2 text-sm text-gray-600">
            {organization?.name} のスタッフの出退勤記録を確認できます
          </p>
        </div>

        <AttendanceRecordsWrapper
          staffList={staffList || []}
          sitesList={sitesList || []}
          userRole={userData.role}
        />
      </div>
    </div>
  )
}
