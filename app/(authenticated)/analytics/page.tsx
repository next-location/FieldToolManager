import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'

export default async function AnalyticsIndexPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single()

  if (!userData || userRole === 'staff') {
    redirect('/')
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">レポート・分析</h1>
        <p className="mt-1 text-sm text-gray-600">
          各種レポートと分析ツールを利用できます
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* コスト分析 */}
        <Link
          href="/analytics/cost"
          className="block bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-lg font-medium text-gray-900">コスト分析</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              道具・消耗品の購入コスト、発注コスト、点検・修理コストを分析し、コスト効率を評価します。
            </p>
          </div>
        </Link>

        {/* 使用頻度分析 */}
        <Link
          href="/analytics/usage"
          className="block bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-lg font-medium text-gray-900">使用頻度分析</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              道具・消耗品の使用パターンを分析し、活発・非活発・未使用の状態を把握します。
            </p>
          </div>
        </Link>

        {/* 在庫最適化 */}
        <Link
          href="/analytics/inventory"
          className="block bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <div className="ml-5">
                <h2 className="text-lg font-medium text-gray-900">在庫最適化</h2>
              </div>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              消耗品の在庫状況を分析し、推奨在庫レベルと発注タイミングを提案します。
            </p>
          </div>
        </Link>
      </div>
      </div>
    </div>
  )
}
