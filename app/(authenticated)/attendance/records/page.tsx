import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { AttendanceRecordsWrapper } from './AttendanceRecordsWrapper'

export default async function AttendanceRecordsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin/manager権限チェック
  if (!['admin', 'manager'].includes(userRole)) {
    redirect('/')
  }

  // 組織情報取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // スタッフ一覧取得（フィルター用）
  const { data: staffList } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // 現場一覧取得（フィルター用）
  const { data: sitesList } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', organizationId)
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
          userRole={userRole}
        />
      </div>
    </div>
  )
}
