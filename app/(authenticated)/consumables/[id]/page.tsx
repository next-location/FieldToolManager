import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import Image from 'next/image'
import { DeleteConsumableButton } from './DeleteConsumableButton'
import { QRCodePrint } from '@/components/qr/QRCodePrint'

export default async function ConsumableDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

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
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 組織のQR印刷サイズ設定を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('qr_print_size')
    .eq('id', userData?.organization_id)
    .single()

  const qrSize = organization?.qr_print_size || 25

  // 在庫情報を取得
  const { data: inventory } = await supabase
    .from('consumable_inventory')
    .select(`
      *,
      site:sites(name),
      warehouse_location:warehouse_locations(code, display_name)
    `)
    .eq('tool_id', id)
    .eq('organization_id', userData?.organization_id)
    .order('location_type')

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
    .eq('organization_id', userData?.organization_id)
    .neq('movement_type', '調整')
    .order('created_at', { ascending: false })
    .limit(10)

  // 在庫調整履歴を取得（最新10件）
  const { data: adjustments } = await supabase
    .from('consumable_movements')
    .select(`
      *,
      performed_by_user:users!consumable_movements_performed_by_fkey(name)
    `)
    .eq('tool_id', id)
    .eq('organization_id', userData?.organization_id)
    .eq('movement_type', '調整')
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
    <div className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <Link
            href="/consumables"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← 消耗品一覧に戻る
          </Link>
        </div>

        {/* 基本情報 */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                消耗品詳細
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                ID: {consumable.id}
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/consumables/${consumable.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                編集
              </Link>
              <DeleteConsumableButton
                consumableId={consumable.id}
                consumableName={consumable.name}
              />
            </div>
          </div>

          {consumable.image_url && (
            <div className="px-4 py-5 sm:px-6 border-t border-gray-200 bg-gray-50">
              <div className="relative w-full h-64 rounded-lg overflow-hidden bg-white">
                <Image
                  src={consumable.image_url}
                  alt={consumable.name}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">消耗品名</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {consumable.name}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">カテゴリ</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {consumable.tool_categories?.name || '未設定'}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">型番</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {consumable.model_number || '未設定'}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">メーカー</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {consumable.manufacturer || '未設定'}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">単位</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {consumable.unit}
                </dd>
              </div>

              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  合計在庫数
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {totalStock} {consumable.unit}
                  {isLowStock && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      ⚠️ 在庫不足
                    </span>
                  )}
                </dd>
              </div>

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">
                  最小在庫数
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {consumable.minimum_stock}
                </dd>
              </div>

              {consumable.notes && (
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">備考</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {consumable.notes}
                  </dd>
                </div>
              )}

              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">QRコード</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <QRCodePrint
                    value={consumable.qr_code}
                    itemName={consumable.name}
                    itemCode={`ID: ${consumable.id.substring(0, 8)}...`}
                    itemType="消耗品"
                    size={200}
                    qrSize={qrSize}
                  />
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* 在庫詳細 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                在庫詳細（全{inventory?.length || 0}箇所）
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                各保管場所の在庫状況
              </p>
            </div>
            <div className="flex space-x-3">
              <Link
                href={`/consumables/${consumable.id}/adjust`}
                className="inline-flex items-center px-4 py-2 border border-blue-600 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
              >
                📦 在庫調整
              </Link>
              <Link
                href={`/consumables/${consumable.id}/move`}
                className="inline-flex items-center px-4 py-2 border border-green-600 rounded-md shadow-sm text-sm font-medium text-green-600 bg-white hover:bg-green-50"
              >
                🚚 移動
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-200">
            {inventory && inventory.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {inventory.map((inv) => {
                  const locationText =
                    inv.location_type === 'warehouse'
                      ? inv.warehouse_location
                        ? `倉庫 (${(inv.warehouse_location as any).code} - ${(inv.warehouse_location as any).display_name})`
                        : '倉庫'
                      : inv.location_type === 'site'
                        ? `現場: ${inv.site ? (inv.site as any).name : '不明'}`
                        : inv.location_type

                  return (
                    <li key={inv.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              📍 {locationText}
                            </span>
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            最終更新:{' '}
                            {new Date(inv.updated_at).toLocaleString('ja-JP')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-gray-900">
                            {inv.quantity}
                            <span className="ml-1 text-sm font-normal text-gray-500">
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
                在庫がありません
              </div>
            )}
          </div>
        </div>

        {/* 在庫調整履歴 */}
        <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              在庫調整履歴（最新10件）
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              過去の在庫調整記録
            </p>
          </div>
          <div className="border-t border-gray-200">
            {adjustments && adjustments.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {adjustments.map((adjustment) => (
                  <li key={adjustment.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          {adjustment.notes || '在庫調整'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {new Date(adjustment.created_at).toLocaleString(
                            'ja-JP'
                          )}{' '}
                          •{' '}
                          {adjustment.performed_by_user
                            ? (adjustment.performed_by_user as any).name
                            : '不明'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-gray-900">
                          {adjustment.quantity}
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            {consumable.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                在庫調整履歴がありません
              </div>
            )}
          </div>
        </div>

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
                      ? '倉庫'
                      : movement.from_location_type === 'site'
                        ? `現場: ${movement.from_site ? (movement.from_site as any).name : '不明'}`
                        : movement.from_location_type

                  const toLocation =
                    movement.to_location_type === 'warehouse'
                      ? '倉庫'
                      : movement.to_location_type === 'site'
                        ? `現場: ${movement.to_site ? (movement.to_site as any).name : '不明'}`
                        : movement.to_location_type

                  return (
                    <li key={movement.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="text-sm text-gray-900">
                            {fromLocation} → {toLocation}
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
