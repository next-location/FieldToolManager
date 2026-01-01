import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { DeleteToolSetButton } from './DeleteToolSetButton'

export default async function ToolSetDetailPage({
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params  // 道具セットの詳細を取得
  const { data: toolSet, error } = await supabase
    .from('tool_sets')
    .select(
      `
      *,
      created_by_user:users!tool_sets_created_by_fkey (
        name,
        email
      )
    `
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !toolSet) {
    redirect('/tool-sets')
  }

  // セットに含まれる個別アイテムを取得
  const { data: setItems } = await supabase
    .from('tool_set_items')
    .select(
      `
      id,
      tool_item:tool_items (
        id,
        serial_number,
        status,
        current_location,
        qr_code,
        notes,
        tool:tools (
          id,
          name,
          model_number,
          manufacturer
        ),
        current_site:sites (
          name
        ),
        warehouse_location:warehouse_locations (
          code,
          display_name
        )
      )
    `
    )
    .eq('tool_set_id', id)
    .order('created_at')

  const toolItems = setItems?.map((item) => (item.tool_item as any)) || []

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/tool-sets"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 道具セット一覧に戻る
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">道具セット詳細</h1>
        </div>

        {/* セット基本情報 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                基本情報
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                ID: {toolSet.id}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/tool-sets/${toolSet.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                編集
              </Link>
              <DeleteToolSetButton toolSetId={toolSet.id} toolSetName={toolSet.name} />
            </div>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">セット名</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {toolSet.name}
                </dd>
              </div>
              {toolSet.description && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">説明</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {toolSet.description}
                  </dd>
                </div>
              )}
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">作成者</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {(toolSet.created_by_user as any)?.name || '不明'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(toolSet.created_at).toLocaleString('ja-JP')}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">道具数</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {toolItems.length}個
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* セット内の道具一覧 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                セット内の道具（全{toolItems.length}個）
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                このセットに含まれる個別アイテム
              </p>
            </div>
            <Link
              href={`/movements/new?tool_set_id=${toolSet.id}`}
              className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
            >
              📦 セット移動
            </Link>
          </div>
          <div className="border-t border-gray-200">
            {toolItems && toolItems.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {toolItems.map((item: any) => {
                  const tool = item.tool
                  const currentSite = item.current_site
                  const warehouseLocation = item.warehouse_location

                  return (
                    <li key={item.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <p className="text-sm font-medium text-gray-900">
                              {tool?.name || '不明な道具'}
                            </p>
                            {tool?.model_number && (
                              <span className="text-xs text-gray-500">
                                ({tool.model_number})
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex flex-col gap-1 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-20">シリアル:</span>
                              <span className="font-mono text-gray-700">
                                #{item.serial_number}
                              </span>
                              <span
                                className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  item.status === 'available'
                                    ? 'bg-green-100 text-green-800'
                                    : item.status === 'in_use'
                                    ? 'bg-blue-100 text-blue-800'
                                    : item.status === 'maintenance'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : item.status === 'lost'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {item.status === 'available'
                                  ? '利用可能'
                                  : item.status === 'in_use'
                                  ? '使用中'
                                  : item.status === 'maintenance'
                                  ? 'メンテナンス中'
                                  : item.status === 'lost'
                                  ? '紛失'
                                  : item.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-20">現在地:</span>
                              <span className="text-gray-600">
                                📍{' '}
                                {item.current_location === 'warehouse'
                                  ? warehouseLocation
                                    ? `倉庫 (${warehouseLocation.code} - ${warehouseLocation.display_name})`
                                    : '倉庫'
                                  : item.current_location === 'site'
                                  ? `現場: ${currentSite?.name || '不明'}`
                                  : item.current_location === 'repair'
                                  ? '修理中'
                                  : item.current_location === 'lost'
                                  ? '紛失'
                                  : item.current_location}
                              </span>
                            </div>
                            {tool?.manufacturer && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400 w-20">メーカー:</span>
                                <span className="text-gray-600">{tool.manufacturer}</span>
                              </div>
                            )}
                          </div>
                          {item.notes && (
                            <p className="mt-1 text-xs text-gray-500">
                              📝 {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/tool-items/${item.id}`}
                            className="inline-flex items-center px-3 py-1 border border-gray-300 rounded text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
                          >
                            詳細
                          </Link>
                          <Link
                            href={`/movements/new?tool_item_id=${item.id}`}
                            className="inline-flex items-center px-3 py-1 border border-blue-600 rounded text-xs font-medium text-blue-600 bg-white hover:bg-blue-50"
                          >
                            📦 移動
                          </Link>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                このセットには道具が登録されていません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
