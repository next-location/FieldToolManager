import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { analyzeInventoryOptimization } from '@/lib/analytics/inventory-optimization'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'

export default async function InventoryOptimizationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData || userData.role === 'staff') {
    redirect('/')
  }

  // パッケージチェック（現場資産パック必須）
  if (userData?.organization_id) {
    const features = await getOrganizationFeatures(userData?.organization_id)
    if (!hasPackage(features, 'asset')) {
      return <PackageRequired packageType="asset" featureName="在庫最適化" userRole={userData.role} />
    }
  }

  // 消耗品のみ取得
  const { data: consumables } = await supabase
    .from('tools')
    .select(`*, categories:category_id(name)`)
    .eq('organization_id', userData?.organization_id)
    .eq('is_consumable', true)
    .is('deleted_at', null)

  const { data: inventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('organization_id', userData?.organization_id)

  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { data: movements } = await supabase
    .from('consumable_movements')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .gte('created_at', sixMonthsAgo.toISOString())

  const consumablesWithCategory = (consumables || []).map((c: any) => ({
    ...c,
    category_name: c.categories?.name || null,
  }))

  const report = await analyzeInventoryOptimization(
    consumablesWithCategory,
    inventory || [],
    movements || [],
    sixMonthsAgo,
    new Date()
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal':
        return 'bg-green-100 text-green-800'
      case 'low':
        return 'bg-yellow-100 text-yellow-800'
      case 'excess':
        return 'bg-blue-100 text-blue-800'
      case 'out_of_stock':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'optimal':
        return '適正'
      case 'low':
        return '低在庫'
      case 'excess':
        return '過剰在庫'
      case 'out_of_stock':
        return '在庫切れ'
      default:
        return status
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">在庫最適化レポート</h1>
        <p className="mt-1 text-sm text-gray-600">消耗品の在庫状況と推奨在庫レベル</p>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-white p-5 shadow rounded-lg">
          <div className="text-sm font-medium text-gray-500">総消耗品数</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">
            {report.total_consumables}
          </div>
        </div>
        <div className="bg-green-50 p-5 shadow rounded-lg">
          <div className="text-sm font-medium text-green-700">適正在庫</div>
          <div className="mt-1 text-2xl font-semibold text-green-900">
            {report.optimal_stock_count}
          </div>
        </div>
        <div className="bg-yellow-50 p-5 shadow rounded-lg">
          <div className="text-sm font-medium text-yellow-700">低在庫</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-900">
            {report.low_stock_count}
          </div>
        </div>
        <div className="bg-blue-50 p-5 shadow rounded-lg">
          <div className="text-sm font-medium text-blue-700">過剰在庫</div>
          <div className="mt-1 text-2xl font-semibold text-blue-900">
            {report.excess_stock_count}
          </div>
        </div>
        <div className="bg-red-50 p-5 shadow rounded-lg">
          <div className="text-sm font-medium text-red-700">在庫切れ</div>
          <div className="mt-1 text-2xl font-semibold text-red-900">
            {report.out_of_stock_count}
          </div>
        </div>
      </div>

      {/* 最適化テーブル */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                消耗品名
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                現在在庫
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                月平均使用量
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                推奨最小在庫
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                在庫状態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                アクション
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {report.optimizations
              .sort((a, b) => {
                if (a.status === 'out_of_stock') return -1
                if (b.status === 'out_of_stock') return 1
                if (a.status === 'low') return -1
                if (b.status === 'low') return 1
                return 0
              })
              .map((opt) => (
                <tr key={opt.tool_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {opt.tool_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {opt.current_inventory}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {opt.average_usage_per_month.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {opt.recommended_min_stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        opt.status
                      )}`}
                    >
                      {getStatusLabel(opt.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {opt.action_needed || '-'}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      </div>
    </div>
  )
}
