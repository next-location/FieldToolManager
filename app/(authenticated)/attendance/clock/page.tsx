import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { AttendanceClockClient } from './AttendanceClockClient'

export default async function AttendanceClockPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role, name')
    .eq('id', userId)
    .single()

  // 組織の出退勤設定を取得
  const { data: orgSettings } = await supabase
    .from('organization_attendance_settings')
    .select('clock_method, allow_manual, allow_qr, allow_location')
    .eq('organization_id', organizationId)
    .single()

  // アクティブな現場リストを取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">出退勤</h1>
          <p className="mt-1 text-sm text-gray-600">
            {userData?.name}さん、こんにちは。出退勤の打刻を行ってください。
          </p>
        </div>

        <AttendanceClockClient
          userId={userId}
          orgSettings={orgSettings}
          sites={sites || []}
        />
      </div>
    </div>
  )
}
