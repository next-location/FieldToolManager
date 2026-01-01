import { redirect } from 'next/navigation'
import ClientsStats from '../ClientsStats'
import { requireAuth } from '@/lib/auth/page-auth'

export default async function ClientsStatsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()


  // 管理者のみアクセス可能
  if (userRole !== 'admin') {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">取引先統計・分析</h1>
          <p className="mt-2 text-sm text-gray-600">
            取引先に関する統計情報と分析レポートを表示します
          </p>
        </div>

        <ClientsStats />
      </div>
    </div>
  )
}
