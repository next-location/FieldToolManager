import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AttendanceWidget } from '../AttendanceWidget'

export default async function Home() {
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
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // オンボーディングチェックは削除（テストデータで常に完了状態）

  // 在庫アラート対象の消耗品を取得
  const { data: consumables } = await supabase
    .from('tools')
    .select('id, name, unit, minimum_stock')
    .eq('organization_id', userData?.organization_id)
    .eq('management_type', 'consumable')
    .gt('minimum_stock', 0)

  // 各消耗品の在庫を集計して低在庫をチェック
  const lowStockConsumables = await Promise.all(
    (consumables || []).map(async (consumable) => {
      const { data: inventories } = await supabase
        .from('consumable_inventory')
        .select('quantity')
        .eq('tool_id', consumable.id)
        .eq('organization_id', userData?.organization_id)

      const totalQty =
        inventories?.reduce((sum, inv) => sum + inv.quantity, 0) || 0

      if (totalQty < consumable.minimum_stock) {
        return {
          ...consumable,
          current_stock: totalQty,
        }
      }
      return null
    })
  ).then((results) => results.filter(Boolean))

  // 重機管理機能が有効かチェック
  const { data: orgData } = await supabase
    .from('organizations')
    .select('heavy_equipment_enabled, name')
    .eq('id', userData?.organization_id)
    .single()

  // 契約情報を取得
  const { data: contractData } = await supabase
    .from('contracts')
    .select('plan, plan_type, monthly_fee, base_monthly_fee, package_monthly_fee, has_asset_package, has_dx_efficiency_package')
    .eq('organization_id', userData?.organization_id)
    .eq('status', 'active')
    .single()

  // 出退勤設定を取得
  const { data: attendanceSettings } = await supabase
    .from('organization_attendance_settings')
    .select('office_attendance_enabled, site_attendance_enabled, office_clock_methods, site_clock_methods, site_qr_type')
    .eq('organization_id', userData?.organization_id)
    .maybeSingle()

  // アクティブな現場リストを取得（出退勤用）
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .order('name')

  // 発注書統計取得（DXパッケージ有効時）
  let purchaseOrderStats = null
  if (contractData?.has_dx_efficiency_package) {
    const { data: purchaseOrders } = await supabase
      .from('purchase_orders')
      .select('id, status, total_amount')
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)

    purchaseOrderStats = {
      total_count: purchaseOrders?.length || 0,
      total_amount: purchaseOrders?.reduce((sum, po) => sum + Number(po.total_amount || 0), 0) || 0,
      pending_approval: purchaseOrders?.filter(po => po.status === 'submitted').length || 0,
      approved: purchaseOrders?.filter(po => ['approved', 'ordered', 'partially_received', 'received'].includes(po.status)).length || 0,
    }
  }

  // 重機のアラートをチェック
  let equipmentAlerts: any[] = []
  if (orgData?.heavy_equipment_enabled) {
    const { data: equipment } = await supabase
      .from('heavy_equipment')
      .select('id, equipment_code, name, vehicle_inspection_date, insurance_end_date, requires_vehicle_inspection')
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)

    const today = new Date()
    equipmentAlerts = (equipment || []).flatMap((equip) => {
      const alerts: any[] = []

      // 車検アラート
      if (equip.requires_vehicle_inspection && equip.vehicle_inspection_date) {
        const inspectionDate = new Date(equip.vehicle_inspection_date)
        const daysUntil = Math.floor((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil < 0) {
          alerts.push({
            ...equip,
            alertType: 'vehicle_inspection',
            severity: 'error',
            message: `車検期限が${Math.abs(daysUntil)}日過ぎています`,
            daysUntil,
          })
        } else if (daysUntil <= 30) {
          alerts.push({
            ...equip,
            alertType: 'vehicle_inspection',
            severity: daysUntil <= 7 ? 'error' : 'warning',
            message: `車検期限まであと${daysUntil}日`,
            daysUntil,
          })
        }
      }

      // 保険アラート
      if (equip.insurance_end_date) {
        const insuranceDate = new Date(equip.insurance_end_date)
        const daysUntil = Math.floor((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysUntil < 0) {
          alerts.push({
            ...equip,
            alertType: 'insurance',
            severity: 'error',
            message: `保険期限が${Math.abs(daysUntil)}日過ぎています`,
            daysUntil,
          })
        } else if (daysUntil <= 30) {
          alerts.push({
            ...equip,
            alertType: 'insurance',
            severity: daysUntil <= 7 ? 'error' : 'warning',
            message: `保険期限まであと${daysUntil}日`,
            daysUntil,
          })
        }
      }

      return alerts
    })

    // 重要度でソート（期限切れ→期限間近）
    equipmentAlerts.sort((a, b) => {
      if (a.daysUntil < 0 && b.daysUntil >= 0) return -1
      if (a.daysUntil >= 0 && b.daysUntil < 0) return 1
      return a.daysUntil - b.daysUntil
    })
  }

  // プラン名の表示
  const getPlanName = (plan: string) => {
    switch (plan) {
      case 'basic': return 'スタート' // 旧データをスタートとして表示
      case 'premium': return 'スタンダード' // 旧データをスタンダードとして表示
      case 'start': return 'スタート'
      case 'standard': return 'スタンダード'
      case 'business': return 'ビジネス'
      case 'pro': return 'プロ'
      case 'enterprise': return 'エンタープライズ'
      default: return plan
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          ダッシュボード
        </h2>

        {/* 契約情報カード */}
        {contractData && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  ご契約プラン
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-blue-700 mb-1">基本プラン</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {getPlanName(contractData.plan)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 mb-1">月額料金</p>
                    <p className="text-2xl font-bold text-blue-900">
                      ¥{contractData.monthly_fee?.toLocaleString()}
                    </p>
                    {contractData.package_monthly_fee > 0 && (
                      <p className="text-xs text-blue-600 mt-1">
                        (基本: ¥{contractData.base_monthly_fee?.toLocaleString()} + パッケージ: ¥{contractData.package_monthly_fee?.toLocaleString()})
                      </p>
                    )}
                  </div>
                </div>
                {(contractData.has_asset_package || contractData.has_dx_efficiency_package) && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <p className="text-sm text-blue-700 mb-2">有効な機能パッケージ</p>
                    <div className="flex flex-wrap gap-2">
                      {contractData.has_asset_package && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          📦 資産管理パッケージ
                        </span>
                      )}
                      {contractData.has_dx_efficiency_package && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          🚀 DX効率化パッケージ
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 重機アラート */}
        {equipmentAlerts.length > 0 && (
          <div className="mb-6 bg-orange-50 border-l-4 border-orange-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">🚨</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-orange-800">
                  重機の車検・保険期限が近づいています
                </h3>
                <div className="mt-2 text-sm text-orange-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {equipmentAlerts.slice(0, 5).map((alert, idx) => (
                      <li key={`${alert.id}-${alert.alertType}`}>
                        <Link
                          href={`/equipment/${alert.id}`}
                          className="hover:underline font-medium"
                        >
                          {alert.equipment_code} - {alert.name}
                        </Link>
                        {': '}
                        <span className={alert.severity === 'error' ? 'text-red-700 font-semibold' : ''}>
                          {alert.alertType === 'vehicle_inspection' ? '車検' : '保険'}
                          {alert.message}
                        </span>
                      </li>
                    ))}
                    {equipmentAlerts.length > 5 && (
                      <li className="text-orange-600">
                        他 {equipmentAlerts.length - 5} 件のアラートがあります
                      </li>
                    )}
                  </ul>
                </div>
                <div className="mt-4">
                  <Link
                    href="/equipment"
                    className="text-sm font-medium text-orange-800 hover:text-orange-900"
                  >
                    重機管理ページへ →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 在庫アラート */}
        {lowStockConsumables.length > 0 && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  消耗品の在庫が不足しています
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc pl-5 space-y-1">
                    {lowStockConsumables.map((item) => item && (
                      <li key={item.id}>
                        <Link
                          href="/consumables"
                          className="hover:underline font-medium"
                        >
                          {item.name}
                        </Link>
                        : 現在 {item.current_stock} {item.unit} (最低在庫:{' '}
                        {item.minimum_stock} {item.unit})
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <Link
                    href="/consumables"
                    className="text-sm font-medium text-red-800 hover:text-red-900"
                  >
                    消耗品管理ページへ →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {/* 出退勤ウィジェット（DXパッケージが必要） */}
          {contractData?.has_dx_efficiency_package && (
            <AttendanceWidget attendanceSettings={attendanceSettings} sites={sites || []} />
          )}

          {/* 道具管理 */}
          <Link
            href="/tools"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">🔧</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      道具管理
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      道具の登録・編集・削除
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* 現場管理 */}
          <Link
            href="/sites"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">🏗️</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      現場管理
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      現場の登録・編集・削除
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* 道具移動履歴 */}
          <Link
            href="/movements"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📦</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      道具移動履歴
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      個別管理道具の出入庫履歴
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* 消耗品移動履歴 */}
          <Link
            href="/consumable-movements"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📊</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      消耗品移動履歴
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      消耗品の移動・調整履歴
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* 道具セット */}
          <Link
            href="/tool-sets"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📋</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      道具セット
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      よく使う道具の組み合わせ
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* QRスキャン */}
          <Link
            href="/scan"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">📱</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      QRスキャン
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      QRコードで道具を検索
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* 消耗品管理 */}
          <Link
            href="/consumables"
            className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-3xl">🧰</span>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      消耗品管理
                    </dt>
                    <dd className="mt-1 text-xs text-gray-400">
                      軍手・テープなどの在庫管理
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </Link>

          {/* 倉庫位置管理（管理者のみ） */}
          {userData?.role === 'admin' && (
            <Link
              href="/warehouse-locations"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📍</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        倉庫位置管理
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        倉庫内の位置を管理
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* 発注書管理（DXパッケージ） */}
          {contractData?.has_dx_efficiency_package && purchaseOrderStats && (
            <Link
              href="/purchase-orders"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">📄</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        発注書管理
                      </dt>
                      <dd className="mt-2 flex items-baseline gap-4">
                        <span className="text-2xl font-semibold text-gray-900">
                          {purchaseOrderStats.total_count}件
                        </span>
                        {purchaseOrderStats.pending_approval > 0 && (
                          <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            承認待ち: {purchaseOrderStats.pending_approval}件
                          </span>
                        )}
                      </dd>
                      <dd className="mt-1 text-xs text-gray-400">
                        総額: ¥{purchaseOrderStats.total_amount.toLocaleString()}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* 組織設定（管理者のみ） */}
          {userData?.role === 'admin' && (
            <Link
              href="/settings/organization"
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow border-2 border-blue-200"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">⚙️</span>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        組織設定
                      </dt>
                      <dd className="mt-1 text-xs text-gray-400">
                        運用方法のカスタマイズ
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
