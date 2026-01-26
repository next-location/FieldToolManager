import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import ToolSetsPageFAB from '@/components/tool-sets/ToolSetsPageFAB'
import ToolSetsList from '@/components/tool-sets/ToolSetsList'

// 道具セットの最新状態を常に取得するためキャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ToolSetsPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // リーダー以上がセット作成可能
  const canCreateSet = userRole === 'admin' || userRole === 'manager' || userRole === 'leader'

  const { data: toolSets, error } = await supabase
    .from('tool_sets')
    .select('id, name, description, created_at, created_by')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // ユーザー情報を取得
  const userIds = [...new Set((toolSets || []).map(set => set.created_by))]
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', userIds)

  // ユーザー情報をマップに変換
  const usersMap = new Map((users || []).map(u => [u.id, u]))

  const toolSetsWithCounts = await Promise.all(
    (toolSets || []).map(async (set) => {
      const { count } = await supabase
        .from('tool_set_items')
        .select('*', { count: 'exact', head: true })
        .eq('tool_set_id', set.id)
      return {
        ...set,
        itemCount: count || 0,
        users: usersMap.get(set.created_by) || null
      }
    })
  )

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="flex justify-between items-center mb-6">
          {/* スマホ: text-lg、PC: text-2xl */}
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">道具セット登録</h1>
          {canCreateSet && (
            <Link
              href="/tool-sets/new"
              className="hidden sm:inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + セットを作成
            </Link>
          )}
        </div>

        {/* FAB for mobile */}
        {canCreateSet && <ToolSetsPageFAB />}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            エラーが発生しました: {error.message}
          </div>
        )}

        {toolSetsWithCounts && toolSetsWithCounts.length > 0 ? (
          <ToolSetsList initialToolSets={toolSetsWithCounts} />
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
