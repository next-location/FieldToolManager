import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MonthlyReport from './MonthlyReport'

/**
 * 月次勤怠集計レポートページ
 * スタッフ別の勤怠統計を表示
 */
export default async function MonthlyReportPage() {
  const supabase = await createClient()

  // 認証確認
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('id, organization_id, role, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限確認
  if (!['admin', 'manager'].includes(userData.role)) {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">月次勤怠集計レポート</h1>
          <p className="mt-2 text-sm text-gray-600">
            スタッフ別の月次勤怠統計を確認できます
          </p>
        </div>

        <MonthlyReport />
      </div>
    </div>
  )
}
