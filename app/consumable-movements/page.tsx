import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ConsumableMovementsPage() {
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
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 消耗品移動履歴を取得
  const { data: movements, error } = await supabase
    .from('consumable_movements')
    .select(
      `
      id,
      movement_type,
      from_location_type,
      to_location_type,
      quantity,
      notes,
      created_at,
      tools (
        name,
        model_number
      ),
      from_site:from_site_id (
        name
      ),
      to_site:to_site_id (
        name
      ),
      users:performed_by (
        name
      )
    `
    )
    .eq('organization_id', userData?.organization_id)
    .order('created_at', { ascending: false })
    .limit(100)

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
                href="/tools"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                道具管理
              </Link>
              <Link
                href="/consumables"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                消耗品一覧
              </Link>
              <Link
                href="/consumable-movements"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                消耗品移動履歴
              </Link>
              <Link
                href="/movements"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                道具移動履歴
              </Link>
              <Link
                href="/sites"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                現場管理
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

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              消耗品移動履歴
            </h1>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              エラーが発生しました: {error.message}
            </div>
          )}

          {movements && movements.length > 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {movements.map((movement: any) => (
                  <li key={movement.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {movement.movement_type}
                          </span>
                          <h3 className="text-sm font-medium text-gray-900">
                            {movement.tools?.name || '不明な道具'}
                          </h3>
                          {movement.tools?.model_number && (
                            <span className="text-sm text-gray-500">
                              ({movement.tools.model_number})
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center space-x-6 text-sm text-gray-500">
                          <div className="flex items-center">
                            <span className="font-medium mr-1">移動元:</span>
                            {movement.from_location_type === 'warehouse'
                              ? '倉庫'
                              : movement.from_site?.name || '不明'}
                          </div>
                          <span>→</span>
                          <div className="flex items-center">
                            <span className="font-medium mr-1">移動先:</span>
                            {movement.to_location_type === 'warehouse'
                              ? '倉庫'
                              : movement.to_site?.name || '不明'}
                          </div>
                          <div className="flex items-center">
                            <span className="font-medium mr-1">数量:</span>
                            {movement.quantity}個
                          </div>
                        </div>

                        {movement.notes && (
                          <div className="mt-2 text-sm text-gray-600">
                            <span className="font-medium">メモ:</span>{' '}
                            {movement.notes}
                          </div>
                        )}

                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                          <span>
                            実行者: {movement.users?.name || '不明'}
                          </span>
                          <span>
                            {new Date(movement.created_at).toLocaleString(
                              'ja-JP',
                              {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              }
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-12 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  移動履歴がありません
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  消耗品の移動を行うと、ここに履歴が表示されます
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
