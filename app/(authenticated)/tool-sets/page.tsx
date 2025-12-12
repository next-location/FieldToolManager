import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ToolSetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) redirect('/login')

  // 管理者またはマネージャーのみセット作成可能
  const canCreateSet = userData.role === 'admin' || userData.role === 'manager'

  const { data: toolSets, error } = await supabase
    .from('tool_sets')
    .select('id, name, description, created_at, created_by, users:created_by (name)')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const toolSetsWithCounts = await Promise.all(
    (toolSets || []).map(async (set) => {
      const { count } = await supabase
        .from('tool_set_items')
        .select('*', { count: 'exact', head: true })
        .eq('tool_set_id', set.id)
      return { ...set, itemCount: count || 0 }
    })
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">道具セット登録</h1>
          {canCreateSet && (
            <Link
              href="/tool-sets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + セットを作成
            </Link>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            エラーが発生しました: {error.message}
          </div>
        )}

        {toolSetsWithCounts && toolSetsWithCounts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolSetsWithCounts.map((set) => (
              <div
                key={set.id}
                className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{set.name}</h3>
                      {set.description && (
                        <p className="mt-1 text-sm text-gray-600">{set.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span>🔧 {set.itemCount}個の道具</span>
                    <span>{new Date(set.created_at).toLocaleDateString('ja-JP')}</span>
                  </div>

                  <div className="flex space-x-2">
                    <Link
                      href={`/tool-sets/${set.id}`}
                      className="flex-1 text-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/movements/new?tool_set_id=${set.id}`}
                      className="flex-1 text-center px-3 py-2 border border-blue-600 rounded-md text-sm font-medium text-blue-600 bg-white hover:bg-blue-50"
                    >
                      📦 セット移動
                    </Link>
                  </div>
                </div>
              </div>
            ))}
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
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">道具セットがありません</h3>
              <p className="mt-1 text-sm text-gray-500">
                よく使う道具の組み合わせをセットとして登録しましょう
              </p>
              {canCreateSet && (
                <div className="mt-6">
                  <Link
                    href="/tool-sets/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + 新しいセットを作成
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
