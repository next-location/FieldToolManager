import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import MonthlyReport from './MonthlyReport'

/**
 * 月次勤怠集計レポートページ
 * スタッフ別の勤怠統計を表示
 */
export default async function MonthlyReportPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 管理者権限確認
  if (!['admin', 'manager'].includes(userRole)) {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pt-3 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">月次勤怠集計レポート</h1>
          <p className="mt-2 text-sm text-gray-600">
            スタッフ別の月次勤怠統計を確認できます
          </p>
        </div>

        <MonthlyReport />
      </div>
    </div>
  )
}
