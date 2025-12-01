import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ConsumablesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 消耗品マスタを取得
  const { data: consumables } = await supabase
    .from('tools')
    .select('id, name, unit, minimum_stock')
    .eq('organization_id', userData.organization_id)
    .eq('management_type', 'consumable')
    .is('deleted_at', null)
    .order('name')

  // 各消耗品の在庫情報を取得
  const consumablesWithInventory = await Promise.all(
    (consumables || []).map(async (consumable) => {
      // 倉庫在庫
      const { data: warehouseInventory } = await supabase
        .from('consumable_inventory')
        .select('quantity')
        .eq('tool_id', consumable.id)
        .eq('location_type', 'warehouse')
        .single()

      // 現場在庫の合計
      const { data: siteInventories } = await supabase
        .from('consumable_inventory')
        .select('quantity')
        .eq('tool_id', consumable.id)
        .eq('location_type', 'site')

      const totalSiteQuantity = siteInventories?.reduce(
        (sum, inv) => sum + inv.quantity,
        0
      ) || 0

      const warehouseQty = warehouseInventory?.quantity || 0
      const totalQty = warehouseQty + totalSiteQuantity

      return {
        ...consumable,
        warehouse_quantity: warehouseQty,
        site_quantity: totalSiteQuantity,
        total_quantity: totalQty,
        is_low_stock: totalQty < consumable.minimum_stock,
      }
    })
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </Link>
              <span className="text-sm font-medium text-blue-600">
                消耗品管理
              </span>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">{user.email}</span>
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6 flex justify-between items-center">
            <Link
              href="/"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← ダッシュボードに戻る
            </Link>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                消耗品一覧
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                軍手、テープなどの消耗品の在庫を管理します
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      消耗品名
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      倉庫在庫
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      現場在庫
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      合計
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      最小在庫
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {consumablesWithInventory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-4 text-center text-sm text-gray-500"
                      >
                        消耗品が登録されていません。
                        <br />
                        道具管理から「消耗品管理」タイプで新規登録してください。
                      </td>
                    </tr>
                  ) : (
                    consumablesWithInventory.map((consumable) => (
                      <tr
                        key={consumable.id}
                        className={
                          consumable.is_low_stock ? 'bg-red-50' : ''
                        }
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {consumable.name}
                            {consumable.is_low_stock && (
                              <span className="ml-2 text-xs text-red-600">
                                ⚠️ 在庫不足
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {consumable.warehouse_quantity} {consumable.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {consumable.site_quantity} {consumable.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {consumable.total_quantity} {consumable.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {consumable.minimum_stock} {consumable.unit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                          <Link
                            href={`/consumables/${consumable.id}/adjust`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            在庫調整
                          </Link>
                          <Link
                            href={`/consumables/${consumable.id}/move`}
                            className="text-green-600 hover:text-green-900"
                          >
                            移動
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
