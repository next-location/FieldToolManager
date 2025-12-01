import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ToolSetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 道具セット一覧を取得
  const { data: toolSets, error } = await supabase
    .from('tool_sets')
    .select(
      `
      *,
      creator:users!tool_sets_created_by_fkey (name),
      items:tool_set_items (
        id,
        quantity,
        tool:tools (id, name)
      )
    `
    )
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

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
                href="/tool-sets"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                道具セット
              </Link>
              <Link
                href="/sites"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                現場管理
              </Link>
              <Link
                href="/movements"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                出入庫履歴
              </Link>
              <Link
                href="/scan"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                QRスキャン
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
            <h1 className="text-2xl font-bold text-gray-900">道具セット管理</h1>
            <Link
              href="/tool-sets/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + セットを作成
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              エラーが発生しました: {error.message}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {toolSets && toolSets.length > 0 ? (
              toolSets.map((set: any) => (
                <Link
                  key={set.id}
                  href={`/tool-sets/${set.id}`}
                  className="block bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {set.name}
                  </h3>
                  {set.description && (
                    <p className="text-sm text-gray-600 mb-4">{set.description}</p>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">
                      道具数: {set.items?.length || 0}点
                    </span>
                    <span className="text-gray-500">
                      作成者: {set.creator?.name || '不明'}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center py-12 text-gray-500">
                道具セットが登録されていません
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
