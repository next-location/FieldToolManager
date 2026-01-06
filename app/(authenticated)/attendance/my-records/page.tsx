import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { MyAttendanceRecordsTable } from './MyAttendanceRecordsTable'

export default async function MyAttendanceRecordsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー名取得
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">勤怠履歴</h1>
          <p className="mt-2 text-sm text-gray-600">
            あなたの出退勤記録を確認できます
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <MyAttendanceRecordsTable userName={userData?.name || ''} />
        </div>
      </div>
    </div>
  )
}
