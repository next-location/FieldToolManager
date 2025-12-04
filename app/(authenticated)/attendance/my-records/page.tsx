import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MyAttendanceRecordsTable } from './MyAttendanceRecordsTable'

export default async function MyAttendanceRecordsPage() {
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
    .select('organization_id, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">勤怠履歴</h1>
          <p className="mt-2 text-sm text-gray-600">
            あなたの出退勤記録を確認できます
          </p>
        </div>

        <div className="bg-white shadow sm:rounded-lg">
          <MyAttendanceRecordsTable userName={userData.name} />
        </div>
      </div>
    </div>
  )
}
