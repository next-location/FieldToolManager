import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { AttendanceSettingsFormSimple } from './AttendanceSettingsFormSimple'

export default async function AttendanceSettingsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin/manager権限がない場合はリダイレクト
  if (!['admin', 'manager'].includes(userRole)) {
    redirect('/')
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', organizationId)
    .single()

  // 出退勤設定を取得
  const { data: attendanceSettings } = await supabase
    .from('organization_attendance_settings')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">出退勤管理設定</h1>
          <p className="mt-2 text-sm text-gray-600">
            {organization?.name} の出退勤管理に関する設定を変更できます
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <AttendanceSettingsFormSimple
            initialSettings={attendanceSettings}
            organizationId={organizationId}
          />
        </div>
      </div>
    </div>
  )
}
