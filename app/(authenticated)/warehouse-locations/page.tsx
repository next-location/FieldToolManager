import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function WarehouseLocationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報を取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (!['admin', 'super_admin'].includes(userData.role)) {
    redirect('/')
  }

  // 倉庫位置を取得
  const { data: locations } = await supabase
    .from('warehouse_locations')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .order('code')

  // 位置ごとの道具数を取得
  const locationsWithCounts = await Promise.all(
    (locations || []).map(async (location) => {
      const { count } = await supabase
        .from('tool_items')
        .select('*', { count: 'exact', head: true })
        .eq('warehouse_location_id', location.id)
        .eq('current_location', 'warehouse')
        .is('deleted_at', null)

      return {
        ...location,
        tool_count: count || 0,
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <Link
                href="/"
                className="text-sm font-medium text-gray-600 hover:text-gray-900 mb-2 inline-block"
              >
                ← ダッシュボードに戻る
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">倉庫位置管理</h1>
              <p className="mt-1 text-sm text-gray-600">
                倉庫内の位置情報を管理し、道具の保管場所を記録します
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/settings/organization#warehouse-hierarchy"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                ⚙️ 階層設定
              </Link>
              <Link
                href="/warehouse-locations/new"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                + 新規登録
              </Link>
            </div>
          </div>

          {locationsWithCounts.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      位置コード
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      表示名
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      説明
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      道具数
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      QR
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {locationsWithCounts.map((location) => (
                    <tr key={location.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{location.code}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{location.display_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {location.description || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{location.tool_count}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {location.qr_code ? (
                          <span className="text-green-600">✓</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/warehouse-locations/${location.id}`}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          詳細
                        </Link>
                        {location.qr_code && (
                          <Link
                            href={`/warehouse-locations/${location.id}/qr`}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            QR印刷
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-12 sm:px-6 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">倉庫位置が登録されていません</h3>
                <p className="mt-1 text-sm text-gray-500">
                  まず階層設定を行ってから、位置を登録してください
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    href="/settings/organization#warehouse-hierarchy"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    階層設定
                  </Link>
                  <Link
                    href="/warehouse-locations/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + 新規登録
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
