import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DemoAnalyticsPage() {
  const supabase = createClient()

  // 認証チェック
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 管理者チェック
  const { data: staff } = await supabase
    .from('staff')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (!staff || staff.role !== 'admin') {
    redirect('/dashboard')
  }

  // KPIデータ取得
  const { data: requests } = await supabase
    .from('demo_requests')
    .select('*')
    .order('created_at', { ascending: false })

  const totalRequests = requests?.length || 0
  const loginCount = requests?.filter(r => r.demo_login_count > 0).length || 0
  const activeCount = requests?.filter(r => r.demo_login_count >= 3).length || 0
  const convertedCount = requests?.filter(r => r.status === 'converted').length || 0

  const loginRate = totalRequests > 0 ? (loginCount / totalRequests) * 100 : 0
  const activeRate = totalRequests > 0 ? (activeCount / totalRequests) * 100 : 0
  const conversionRate = totalRequests > 0 ? (convertedCount / totalRequests) * 100 : 0

  // 直近7日間のデータ
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  const recentRequests = requests?.filter(r => new Date(r.created_at) >= sevenDaysAgo).length || 0

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">デモ環境KPI</h1>

        {/* KPIカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <KPICard
            title="資料請求数"
            value={totalRequests.toString()}
            subtitle={`直近7日: ${recentRequests}件`}
            color="bg-blue-500"
          />
          <KPICard
            title="ログイン率"
            value={`${loginRate.toFixed(1)}%`}
            subtitle={`${loginCount}/${totalRequests}件`}
            color="bg-green-500"
          />
          <KPICard
            title="アクティブ率"
            value={`${activeRate.toFixed(1)}%`}
            subtitle={`3回以上ログイン: ${activeCount}件`}
            color="bg-purple-500"
          />
          <KPICard
            title="コンバージョン率"
            value={`${conversionRate.toFixed(1)}%`}
            subtitle={`契約: ${convertedCount}件`}
            color="bg-orange-500"
          />
        </div>

        {/* リクエスト一覧 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">デモ申請一覧</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    申請日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    会社名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    担当者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    メール
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    従業員数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ログイン回数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最終ログイン
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {requests?.map((request) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(request.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {request.company_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.person_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.employee_count || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {request.demo_login_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.last_demo_login_at
                        ? new Date(request.last_demo_login_at).toLocaleDateString('ja-JP')
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={request.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function KPICard({
  title,
  value,
  subtitle,
  color
}: {
  title: string
  value: string
  subtitle: string
  color: string
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      <p className="text-sm text-gray-500">{subtitle}</p>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    pending: { label: '申請中', color: 'bg-yellow-100 text-yellow-800' },
    approved: { label: 'デモ中', color: 'bg-green-100 text-green-800' },
    expired: { label: '期限切れ', color: 'bg-gray-100 text-gray-800' },
    converted: { label: '契約済', color: 'bg-blue-100 text-blue-800' },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}
