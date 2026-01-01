import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import AlertsList from './AlertsList'

/**
 * 出退勤アラート一覧ページ
 * ユーザーは自分のアラート、管理者は全アラートを閲覧可能
 */
export default async function AlertsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">出退勤アラート</h1>
          <p className="mt-2 text-sm text-gray-600">
            出勤・退勤忘れや日次レポートなどの通知を確認できます
          </p>
        </div>

        <AlertsList userRole={userRole} />
      </div>
    </div>
  )
}
