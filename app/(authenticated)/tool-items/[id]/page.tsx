import { requireAuth } from '@/lib/auth/page-auth'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { QRCodeDisplay } from '@/app/(authenticated)/tools/[id]/QRCodeDisplay'
import { StatusChangeButton } from './StatusChangeButton'

export default async function ToolItemDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 個別アイテムの詳細情報を取得
  const { data: toolItem, error } = await supabase
    .from('tool_items')
    .select(
      `
      id,
      serial_number,
      qr_code,
      current_location,
      current_site_id,
      status,
      notes,
      created_at,
      updated_at,
      tools (
        id,
        name,
        model_number,
        manufacturer,
        category_id
      ),
      current_site:sites!tool_items_current_site_id_fkey (
        id,
        name
      )
    `
    )
    .eq('id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .single()

  if (error || !toolItem) {
    notFound()
  }

  // この個別アイテムの移動履歴を取得
  const { data: movements } = await supabase
    .from('tool_movements')
    .select(
      `
      id,
      movement_type,
      quantity,
      notes,
      created_at,
      performed_by,
      users!tool_movements_performed_by_fkey (
        id,
        name
      ),
      from_site:sites!tool_movements_from_site_id_fkey (
        id,
        name
      ),
      to_site:sites!tool_movements_to_site_id_fkey (
        id,
        name
      )
    `
    )
    .eq('tool_item_id', id)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(20)

  const tool = toolItem.tools as any
  const currentSite = toolItem.current_site as any

  // 現在地のテキスト表示
  const currentLocationText =
    toolItem.current_location === 'warehouse'
      ? '倉庫'
      : toolItem.current_location === 'site'
      ? currentSite?.name || '現場（不明）'
      : toolItem.current_location === 'repair'
      ? '修理中'
      : toolItem.current_location === 'lost'
      ? '紛失'
      : '不明'

  // ステータスのテキスト表示
  const statusText =
    toolItem.status === 'available'
      ? '利用可能'
      : toolItem.status === 'in_use'
      ? '使用中'
      : toolItem.status === 'maintenance'
      ? 'メンテナンス中'
      : toolItem.status === 'lost'
      ? '紛失'
      : '不明'

  const statusColor =
    toolItem.status === 'available'
      ? 'text-green-600 bg-green-50'
      : toolItem.status === 'in_use'
      ? 'text-blue-600 bg-blue-50'
      : toolItem.status === 'maintenance'
      ? 'text-yellow-600 bg-yellow-50'
      : toolItem.status === 'lost'
      ? 'text-red-600 bg-red-50'
      : 'text-gray-600 bg-gray-50'

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href={`/tools/${tool.id}`}
              className="text-sm text-gray-600 hover:text-gray-900 mb-2 inline-block"
            >
              ← 道具マスタに戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">
              {tool.name} #{toolItem.serial_number}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {tool.model_number && `${tool.model_number} `}
              {tool.manufacturer && `| ${tool.manufacturer}`}
            </p>
          </div>
          <Link
            href={`/movements/new?tool_item_id=${toolItem.id}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            📦 移動
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左カラム: 基本情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報カード */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                基本情報
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    シリアル番号
                  </dt>
                  <dd className="mt-1 text-lg font-mono text-gray-900">
                    #{toolItem.serial_number}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">
                    ステータス
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${statusColor}`}
                    >
                      {statusText}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">現在地</dt>
                  <dd className="mt-1 text-lg text-gray-900">
                    📍 {currentLocationText}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-600">登録日</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(toolItem.created_at).toLocaleDateString('ja-JP')}
                  </dd>
                </div>
              </dl>
              {toolItem.notes && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <dt className="text-sm font-medium text-gray-600 mb-2">
                    備考
                  </dt>
                  <dd className="text-sm text-gray-900 whitespace-pre-wrap">
                    {toolItem.notes}
                  </dd>
                </div>
              )}
            </div>

            {/* ステータス変更カード */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                ステータス変更
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                紛失、廃棄、メンテナンスなどの特別な状態を登録できます
              </p>
              <StatusChangeButton
                toolItemId={toolItem.id}
                currentStatus={toolItem.status}
              />
            </div>

            {/* 移動履歴カード */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                移動履歴
              </h2>
              {movements && movements.length > 0 ? (
                <div className="space-y-4">
                  {movements.map((movement) => {
                    const performer = movement.users as any
                    const fromSite = movement.from_site as any
                    const toSite = movement.to_site as any

                    const movementTypeText =
                      movement.movement_type === 'check_out'
                        ? '🔵 持ち出し'
                        : movement.movement_type === 'check_in'
                        ? '🟢 返却'
                        : movement.movement_type === 'transfer'
                        ? '🔄 移動'
                        : movement.movement_type === 'repair'
                        ? '🔧 修理'
                        : movement.movement_type === 'return_from_repair'
                        ? '✅ 修理完了'
                        : movement.movement_type === 'lost'
                        ? '🚨 紛失報告'
                        : movement.movement_type === 'disposed'
                        ? '🗑️ 廃棄'
                        : movement.movement_type === 'maintenance'
                        ? '🔧 メンテナンス'
                        : movement.movement_type === 'correction'
                        ? '🔄 位置修正'
                        : movement.movement_type

                    const fromLocationText = fromSite?.name || '倉庫'
                    const toLocationText = toSite?.name || '倉庫'

                    return (
                      <div
                        key={movement.id}
                        className="border-l-4 border-blue-500 pl-4 py-2"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">
                            {movementTypeText}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(movement.created_at).toLocaleString(
                              'ja-JP',
                              {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {fromLocationText} → {toLocationText}
                        </div>
                        {movement.notes && (
                          <div className="text-sm text-gray-500 mt-1">
                            {movement.notes}
                          </div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          実行者: {performer?.name || '不明'}
                        </div>
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

          {/* 右カラム: QRコード */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                QRコード
              </h2>
              <div className="flex flex-col items-center">
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200">
                  <QRCodeDisplay value={toolItem.qr_code} size={200} />
                </div>
                <p className="text-xs text-gray-500 mt-4 text-center font-mono break-all">
                  {toolItem.qr_code}
                </p>
                <p className="text-xs text-gray-400 mt-2 text-center">
                  このQRコードをスキャンすると、このページに直接アクセスできます
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
