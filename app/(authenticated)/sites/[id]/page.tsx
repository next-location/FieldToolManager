import { requireAuth } from '@/lib/auth/page-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CompleteSiteButton } from './CompleteSiteButton'
import { DeleteSiteButton } from './DeleteSiteButton'

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 現場詳細を取得
  const { data: site, error } = await supabase
    .from('sites')
    .select(
      `
      *,
      manager:users!sites_manager_id_fkey (
        id,
        name,
        email
      ),
      client:clients (
        id,
        name,
        code
      )
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !site) {
    notFound()
  }

  // この現場にある道具を取得
  const { data: tools } = await supabase
    .from('tools')
    .select('id, name, model_number, status, quantity')
    .eq('current_site_id', id)
    .is('deleted_at', null)
    .order('name')

  // 移動履歴を取得
  const { data: movements } = await supabase
    .from('tool_movements')
    .select(
      `
      *,
      tool:tools (name, model_number),
      user:users!tool_movements_performed_by_fkey (name)
    `
    )
    .or(`from_site_id.eq.${id},to_site_id.eq.${id}`)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/sites"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← 現場一覧に戻る
            </Link>
          </div>

          {/* 現場情報 */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {site.name}
                </h1>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      site.is_active
                        ? 'bg-green-100 text-green-800'
                        : site.completed_at
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {site.is_active ? '稼働中' : site.completed_at ? '完了' : '停止中'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/sites/${id}/edit`}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                >
                  編集
                </Link>
                {site.is_active && <CompleteSiteButton siteId={id} />}
                <DeleteSiteButton siteId={id} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {site.client && (
                <div>
                  <p className="text-sm text-gray-600">取引先</p>
                  <p className="text-gray-900">
                    <Link href={`/clients/${site.client.id}`} className="text-blue-600 hover:text-blue-800">
                      🏢 {site.client.name} ({site.client.code})
                    </Link>
                  </p>
                </div>
              )}
              {site.address && (
                <div>
                  <p className="text-sm text-gray-600">住所</p>
                  <p className="text-gray-900">📍 {site.address}</p>
                </div>
              )}
              {site.manager && (
                <div>
                  <p className="text-sm text-gray-600">現場責任者</p>
                  <p className="text-gray-900">
                    👤 {site.manager.name} ({site.manager.email})
                  </p>
                </div>
              )}
              {site.completed_at && (
                <div>
                  <p className="text-sm text-gray-600">完了日</p>
                  <p className="text-gray-900">
                    ✅ {new Date(site.completed_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">登録日</p>
                <p className="text-gray-900">
                  {new Date(site.created_at).toLocaleDateString('ja-JP')}
                </p>
              </div>
            </div>
          </div>

          {/* 現場にある道具 */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              この現場にある道具 ({tools?.length || 0}件)
            </h2>
            {tools && tools.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        道具名
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        型番
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        数量
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        状態
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tools.map((tool) => (
                      <tr key={tool.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/tools/${tool.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {tool.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {tool.model_number || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {tool.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              tool.status === 'available'
                                ? 'bg-green-100 text-green-800'
                                : tool.status === 'in_use'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {tool.status === 'available'
                              ? '利用可能'
                              : tool.status === 'in_use'
                              ? '使用中'
                              : tool.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                この現場に配置されている道具はありません
              </p>
            )}
          </div>

          {/* 移動履歴 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              最近の移動履歴
            </h2>
            {movements && movements.length > 0 ? (
              <div className="space-y-4">
                {movements.map((movement) => (
                  <div
                    key={movement.id}
                    className="border-l-4 border-blue-500 pl-4 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {movement.tool?.name || '不明な道具'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {movement.movement_type === 'check_out'
                            ? '🔵 持ち出し'
                            : movement.movement_type === 'check_in'
                            ? '🟢 返却'
                            : '🔄 移動'}{' '}
                          | 実施者: {movement.user?.name || '不明'}
                        </p>
                        {movement.notes && (
                          <p className="text-sm text-gray-500 mt-1">
                            メモ: {movement.notes}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(movement.created_at).toLocaleString('ja-JP')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                移動履歴がありません
              </p>
            )}
          </div>
        </div>
      </div>
  )
}
