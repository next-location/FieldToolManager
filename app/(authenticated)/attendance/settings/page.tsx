import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AttendanceSettingsFormSimple } from './AttendanceSettingsFormSimple'

export default async function AttendanceSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報と権限を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('id', user.id)
    .single()

  // admin/manager権限がない場合はリダイレクト
  if (!userData || !['admin', 'manager'].includes(userData.role)) {
    redirect('/')
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', userData?.organization_id)
    .single()

  // 出退勤設定を取得
  const { data: attendanceSettings } = await supabase
    .from('organization_attendance_settings')
    .select('*')
    .eq('organization_id', userData?.organization_id)
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
            organizationId={userData?.organization_id}
          />
        </div>
      </div>
    </div>
  )
}
