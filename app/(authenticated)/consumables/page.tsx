import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ConsumablesList from '@/components/consumables/ConsumablesList'

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

  const isAdmin = userData.role === 'admin'

  // 消耗品マスタを取得
  const { data: consumables, error } = await supabase
    .from('tools')
    .select(`
      *,
      tool_categories (
        name
      )
    `)
    .eq('organization_id', userData?.organization_id)
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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">消耗品一覧</h1>
          {isAdmin && (
            <div className="flex space-x-3">
              <Link
                href="/consumables/bulk-qr"
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                🖨️ QRコード一括印刷
              </Link>
              <Link
                href="/consumables/new"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                + 新規登録
              </Link>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4 mb-4">
            <p className="text-sm text-red-800">
              エラーが発生しました: {error.message}
            </p>
          </div>
        )}

        <ConsumablesList initialConsumables={consumablesWithInventory || []} />
      </div>
    </div>
  )
}
