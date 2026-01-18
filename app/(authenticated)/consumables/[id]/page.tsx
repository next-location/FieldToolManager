import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import Image from 'next/image'
import { DeleteConsumableButton } from './DeleteConsumableButton'
import { QRCodePrint } from '@/components/qr/QRCodePrint'
import { InventoryActionButtons } from './InventoryActionButtons'
import { AdjustmentHistory } from './AdjustmentHistory'

export default async function ConsumableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 消耗品マスター情報を取得
  const { data: consumable, error } = await supabase
    .from('tools')
    .select('*, tool_categories (name)')
    .eq('id', id)
    .eq('management_type', 'consumable')
    .is('deleted_at', null)
    .single()

  if (error || !consumable) {
    redirect('/consumables')
  }

  // 組織IDとQR印刷サイズを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 組織のQR印刷サイズ設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('qr_print_size')
    .eq('id', organizationId)
    .single()

  const qrSize = organization?.qr_print_size || 25

  // 在庫情報を取得（倉庫→現場の順、現場内は作成日時順で固定）
  const { data: inventory } = await supabase
    .from('consumable_inventory')
    .select(`
      *,
      site:sites!consumable_inventory_site_id_fkey(name),
      warehouse_location:warehouse_locations(code, display_name)
    `)
    .eq('tool_id', id)
    .eq('organization_id', organizationId)
    .order('location_type', { ascending: false })
    .order('created_at', { ascending: true })

  // 移動履歴を取得（最新10件、在庫調整を除外）
  const { data: movements } = await supabase
    .from('consumable_movements')
    .select(`
      *,
      performed_by_user:users!consumable_movements_performed_by_fkey(name),
      from_site:sites!consumable_movements_from_site_id_fkey(name),
      to_site:sites!consumable_movements_to_site_id_fkey(name)
    `)
    .eq('tool_id', id)
    .eq('organization_id', organizationId)
    .neq('movement_type', '調整')
    .order('created_at', { ascending: false })
    .limit(10)

  // 在庫調整・消費履歴を取得（最新10件）
  const { data: adjustments } = await supabase
    .from('consumable_movements')
    .select(`
      *,
      performed_by_user:users!consumable_movements_performed_by_fkey(name)
    `)
    .eq('tool_id', id)
    .eq('organization_id', organizationId)
    .in('movement_type', ['調整', '消費'])
    .order('created_at', { ascending: false })
    .limit(10)

  // 合計在庫数を計算
  const totalStock = inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0

  // 倉庫在庫数を計算
  const warehouseStock =
    inventory
      ?.filter((inv) => inv.location_type === 'warehouse')
      .reduce((sum, inv) => sum + inv.quantity, 0) || 0

  // 現場在庫数を計算
  const siteStock =
    inventory
      ?.filter((inv) => inv.location_type === 'site')
      .reduce((sum, inv) => sum + inv.quantity, 0) || 0

  // 在庫不足判定
  const isLowStock = totalStock < (consumable.minimum_stock || 0)

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/consumables"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 消耗品一覧に戻る
          </Link>
        </div>

        {/* ヘッダー: タイトルとボタン */}
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4">
            {consumable.name}
          </h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href={`/consumables/${consumable.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              編集
            </Link>
            <DeleteConsumableButton
              consumableId={consumable.id}
              consumableName={consumable.name}
            />
          </div>
        </div>

        {/* 基本情報 */}
        <div className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">型番</p>
              <p className="text-base text-gray-900">{consumable.model_number || '未設定'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">メーカー</p>
              <p className="text-base text-gray-900">{consumable.manufacturer || '未設定'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">単位</p>
              <p className="text-base text-gray-900">{consumable.unit}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">合計在庫数</p>
              <p className="text-base text-gray-900">
                {totalStock} {consumable.unit}
                {isLowStock && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                    ⚠️ 在庫不足
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">最小在庫数</p>
              <p className="text-base text-gray-900">{consumable.minimum_stock}</p>
            </div>
            {consumable.notes && (
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-gray-600 mb-1">備考</p>
                <p className="text-base text-gray-900">{consumable.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* QRコード */}
        <div className="mb-6">
          <h2 className="text-base font-medium text-gray-900 mb-4">QRコード</h2>
          <QRCodePrint
            value={consumable.qr_code}
            itemName={consumable.name}
            itemCode={`ID: ${consumable.id.substring(0, 8)}...`}
            itemType="消耗品"
            size={200}
            qrSize={qrSize}
          />
        </div>

        {/* 在庫詳細 */}
        <div className="mt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
            <div>
              <h2 className="text-base font-medium text-gray-900">
                在庫詳細（全{inventory?.length || 0}箇所）
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                各保管場所の在庫状況
              </p>
            </div>
            {(userRole === 'manager' || userRole === 'admin') && (
              <Link
                href={`/consumables/${consumable.id}/adjust`}
                className="inline-flex items-center justify-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
              >
                📦 在庫調整
              </Link>
            )}
          </div>

          {inventory && inventory.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {inventory.map((inv) => {
                  const locationText =
                    inv.location_type === 'warehouse'
                      ? inv.warehouse_location
                        ? `会社 (${(inv.warehouse_location as any).code} - ${(inv.warehouse_location as any).display_name})`
                        : '会社'
                      : inv.location_type === 'site'
                        ? `現場: ${inv.site ? (inv.site as any).name : '不明'}`
                        : inv.location_type

                  return (
                    <li key={inv.id} className="px-4 py-4 sm:px-6">
                      {/* スマホ: 縦並び、PC: 横並び */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center">
                            <span className="text-base sm:text-sm font-medium text-gray-900">
                              📍 {locationText}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            最終更新:{' '}
                            {new Date(inv.updated_at).toLocaleString('ja-JP')}
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-4">
                          <div className="text-right">
                            <div className="text-2xl sm:text-lg font-bold text-gray-900">
                              {inv.quantity}
                              <span className="ml-1 text-base sm:text-sm font-normal text-gray-500">
                                {consumable.unit}
                              </span>
                            </div>
                          </div>
                          <div className="shrink-0">
                            <InventoryActionButtons
                              consumableId={consumable.id}
                              inventoryId={inv.id}
                              currentQuantity={inv.quantity}
                              unit={consumable.unit}
                              locationText={locationText}
                              userRole={userRole}
                            />
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg px-4 py-6 text-center text-sm text-gray-500">
              在庫がありません
            </div>
          )}
        </div>

        {/* 在庫調整・消費履歴 */}
        <AdjustmentHistory
          consumableId={consumable.id}
          organizationId={organizationId}
          initialAdjustments={adjustments || []}
          unit={consumable.unit}
        />

        {/* 移動履歴 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                移動履歴（最新10件）
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                過去の移動記録
              </p>
            </div>
          </div>
          <div className="border-t border-gray-200">
            {movements && movements.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {movements.map((movement) => {
                  const fromLocation =
                    movement.from_location_type === 'warehouse'
                      ? '会社'
                      : movement.from_location_type === 'site'
                        ? `現場: ${movement.from_site ? (movement.from_site as any).name : '不明'}`
                        : movement.from_location_type

                  const toLocation =
                    movement.to_location_type === 'warehouse'
                      ? '会社'
                      : movement.to_location_type === 'site'
                        ? `現場: ${movement.to_site ? (movement.to_site as any).name : '不明'}`
                        : movement.to_location_type

                  // 消費の場合は特別な表示
                  const isConsumption = movement.movement_type === '消費'
                  const displayText = isConsumption
                    ? `${fromLocation}で消費`
                    : `${fromLocation} → ${toLocation}`

                  return (
                    <li key={movement.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {isConsumption && <span className="mr-1">📝</span>}
                            {displayText}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {new Date(movement.created_at).toLocaleString(
                              'ja-JP'
                            )}{' '}
                            •{' '}
                            {movement.performed_by_user
                              ? (movement.performed_by_user as any).name
                              : '不明'}
                          </div>
                          {movement.notes && (
                            <div className="mt-1 text-xs text-gray-500">
                              📝 {movement.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-900">
                            {movement.quantity}
                            <span className="ml-1 text-xs font-normal text-gray-500">
                              {consumable.unit}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                移動履歴がありません
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
