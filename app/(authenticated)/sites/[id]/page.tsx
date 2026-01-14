import { requireAuth } from '@/lib/auth/page-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { CompleteSiteButton } from './CompleteSiteButton'
import { DeleteSiteButton } from './DeleteSiteButton'
import { QRCodeDisplay } from './QRCodeDisplay'

export default async function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  console.log('[Site Detail] START - id:', id)

  const { userId, organizationId, userRole, supabase } = await requireAuth()
  console.log('[Site Detail] Auth OK - userId:', userId, 'organizationId:', organizationId)

  // 組織のQR印刷サイズ設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('qr_print_size')
    .eq('id', organizationId)
    .single()

  const qrSize = organization?.qr_print_size || 25

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
        name
      )
    `
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  console.log('[Site Detail] Query result - site:', !!site, 'error:', error)

  if (error || !site) {
    console.error('[Site Detail] Error fetching site:', { id, organizationId, error })
    notFound()
  }

  // この現場にある道具（個別アイテム）を取得
  const { data: toolItems, error: toolItemsError } = await supabase
    .from('tool_items')
    .select(`
      id,
      serial_number,
      status,
      current_location,
      tool:tools!tool_items_tool_id_fkey (
        id,
        name,
        model_number
      )
    `)
    .eq('current_site_id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('tool_id')

  console.log('[Site Detail] Tool items:', toolItems?.length || 0, 'error:', toolItemsError)

  // 移動履歴を取得
  const { data: movements } = await supabase
    .from('tool_movements')
    .select(
      `
      *,
      tool:tools (name, model_number),
      tool_item:tool_items (serial_number),
      user:users!tool_movements_performed_by_fkey (name)
    `
    )
    .eq('organization_id', organizationId)
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
          <div className="mb-6">
            {/* ヘッダー部分 - モバイル対応 */}
            <div className="mb-4">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-2">
                {site.name}
              </h1>
              <div className="flex items-center gap-2 mb-3">
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

              {/* ボタンエリア - モバイルでは縦並び */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Link
                  href={`/sites/${id}/edit`}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium text-center"
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
                      🏢 {site.client.name}
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

            {/* QRコード表示 */}
            {site.qr_code && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">現場QRコード</h3>
                <QRCodeDisplay value={site.qr_code} size={200} label={site.name} qrSize={qrSize} />
              </div>
            )}
          </div>

          {/* 現場にある道具 - モバイル対応カード形式 */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              この現場にある道具 ({toolItems?.length || 0}個)
            </h2>
            {toolItems && toolItems.length > 0 ? (
              <div className="space-y-3">
                {toolItems.map((item) => {
                  const tool = Array.isArray(item.tool) ? item.tool[0] : item.tool
                  return (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <Link
                            href={`/tools/${tool?.id}`}
                            className="text-base font-medium text-blue-600 hover:text-blue-800"
                          >
                            {tool?.name}
                          </Link>
                          {tool?.model_number && (
                            <p className="text-sm text-gray-500 mt-1">型番: {tool.model_number}</p>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 ${
                            item.status === 'available'
                              ? 'bg-green-100 text-green-800'
                              : item.status === 'in_use'
                              ? 'bg-blue-100 text-blue-800'
                              : item.status === 'maintenance'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {item.status === 'available'
                            ? '利用可能'
                            : item.status === 'in_use'
                            ? '使用中'
                            : item.status === 'maintenance'
                            ? 'メンテナンス中'
                            : item.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Link
                          href={`/tool-items/${item.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          個別番号: #{item.serial_number}
                        </Link>
                        <Link
                          href={`/tool-items/${item.id}`}
                          className="text-sm text-gray-600 hover:text-gray-900"
                        >
                          詳細 →
                        </Link>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                この現場に配置されている道具はありません
              </p>
            )}
          </div>

          {/* 移動履歴 - モバイル対応 */}
          <div className="bg-white shadow rounded-lg p-4 sm:p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              最近の移動履歴
            </h2>
            {movements && movements.length > 0 ? (
              <div className="space-y-3">
                {movements.map((movement) => {
                  const toolItem = Array.isArray(movement.tool_item) ? movement.tool_item[0] : movement.tool_item
                  return (
                  <div
                    key={movement.id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    {/* 上部：道具名とタイプ */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-base">
                          {movement.tool?.name || '不明な道具'}
                        </p>
                        {toolItem?.serial_number && (
                          <p className="text-sm text-gray-600 mt-1">
                            個別番号: #{toolItem.serial_number}
                          </p>
                        )}
                      </div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ml-2 ${
                        movement.movement_type === 'check_out'
                          ? 'bg-blue-100 text-blue-800'
                          : movement.movement_type === 'check_in'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {movement.movement_type === 'check_out'
                          ? '持ち出し'
                          : movement.movement_type === 'check_in'
                          ? '返却'
                          : '移動'}
                      </span>
                    </div>

                    {/* 中部：実施者 */}
                    <p className="text-sm text-gray-600 mb-2">
                      実施者: {movement.user?.name || '不明'}
                    </p>

                    {/* メモ */}
                    {movement.notes && (
                      <p className="text-sm text-gray-500 bg-gray-50 p-2 rounded mb-2">
                        メモ: {movement.notes}
                      </p>
                    )}

                    {/* 下部：日時 */}
                    <p className="text-xs text-gray-500">
                      {new Date(movement.created_at).toLocaleString('ja-JP', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  )
                })}
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
