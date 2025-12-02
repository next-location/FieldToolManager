import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AdjustmentForm } from './AdjustmentForm'

export default async function ConsumableAdjustPage({
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

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 消耗品情報取得
  const { data: consumable } = await supabase
    .from('tools')
    .select('id, name, unit, minimum_stock')
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .eq('management_type', 'consumable')
    .is('deleted_at', null)
    .single()

  if (!consumable) {
    redirect('/consumables')
  }

  // 倉庫在庫取得
  const { data: warehouseInventory } = await supabase
    .from('consumable_inventory')
    .select('*')
    .eq('tool_id', id)
    .eq('location_type', 'warehouse')
    .single()

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/" className="text-xl font-bold text-gray-900">
                Field Tool Manager
              </Link>
              <Link
                href="/consumables"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                消耗品管理
              </Link>
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

      <main className="max-w-3xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-6">
            <Link
              href="/consumables"
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← 消耗品一覧に戻る
            </Link>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">
                在庫調整：{consumable.name}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                現在の倉庫在庫：
                {warehouseInventory?.quantity || 0} {consumable.unit}
              </p>
            </div>

            <div className="px-4 py-5 sm:p-6">
              <AdjustmentForm
                consumableId={id}
                consumableName={consumable.name}
                unit={consumable.unit}
                currentQuantity={warehouseInventory?.quantity || 0}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
