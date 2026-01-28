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
      <div className="px-4 pt-3 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">取引先統計・分析</h1>
          <p className="mt-2 text-sm text-gray-600">
            取引先（顧客・仕入先・協力会社）に関する経営分析と意思決定を支援します
          </p>
        </div>

        <ClientsStats />
      </div>
    </div>
  )
}
