import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { AppLayout } from '@/components/AppLayout'

export default async function Home() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

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

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, setup_completed_at')
    .eq('id', userData.organization_id)
    .single()

  // 組織のセットアップ状態をチェック
  if (userData?.role === 'admin') {
    // セットアップ未完了の場合、onboardingページにリダイレクト
    if (!organization?.setup_completed_at) {
      redirect('/onboarding')
    }
  }

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

  return (
    <AppLayout
      user={{ email: user.email, id: user.id }}
      userRole={userData.role}
      organizationId={userData.organization_id}
      organizationName={organization?.name}
    >
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            ダッシュボード
          </h2>

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
                      {lowStockConsumables.map((item) => (
                        <li key={item.id}>
                          <Link
                            href="/consumables"
                            className="hover:underline font-medium"
                          >
                            {item.name}
                          </Link>
                          : 現在 {item.current_stock} {item.unit} (最低在庫: {item.minimum_stock} {item.unit})
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
    </AppLayout>
  )
}
