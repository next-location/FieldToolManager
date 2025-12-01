import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function ToolsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザーの組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('email', user.email)
    .single()

  // 道具マスタと個別アイテム数を取得
  const { data: tools, error } = await supabase
    .from('tools')
    .select(`
      *,
      tool_categories (
        name
      )
    `)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 各道具の個別アイテム情報を取得
  const toolsWithItems = await Promise.all(
    (tools || []).map(async (tool) => {
      const { data: items } = await supabase
        .from('tool_items')
        .select('id, serial_number, current_location, current_site_id, status')
        .eq('tool_id', tool.id)
        .is('deleted_at', null)
        .order('serial_number')

      // 位置別の集計
      const locationCounts = (items || []).reduce((acc, item) => {
        acc[item.current_location] = (acc[item.current_location] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // ステータス別の集計
      const statusCounts = (items || []).reduce((acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        ...tool,
        items: items || [],
        itemCount: items?.length || 0,
        locationCounts,
        statusCounts,
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
              <Link
                href="/tools"
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                道具管理
              </Link>
              <Link
                href="/scan"
                className="text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                QRスキャン
              </Link>
            </div>
            <div className="flex items-center">
              <span className="text-sm text-gray-700 mr-4">
                {user.email}
              </span>
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
            <h1 className="text-2xl font-bold text-gray-900">道具一覧</h1>
            <Link
              href="/tools/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              + 新規登録
            </Link>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4 mb-4">
              <p className="text-sm text-red-800">
                エラーが発生しました: {error.message}
              </p>
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            {toolsWithItems && toolsWithItems.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {toolsWithItems.map((tool) => (
                  <li key={tool.id}>
                    <Link
                      href={`/tools/${tool.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {tool.name}
                            </p>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <span className="mr-4">
                                型番: {tool.model_number || '未設定'}
                              </span>
                              <span className="mr-4">
                                メーカー: {tool.manufacturer || '未設定'}
                              </span>
                              <span className="mr-4">
                                合計: {tool.itemCount}台
                              </span>
                            </div>
                            <div className="mt-1 flex items-center text-xs text-gray-400">
                              {tool.locationCounts.warehouse && (
                                <span className="mr-3">
                                  📦 倉庫: {tool.locationCounts.warehouse}
                                </span>
                              )}
                              {tool.locationCounts.site && (
                                <span className="mr-3">
                                  🏗️ 現場: {tool.locationCounts.site}
                                </span>
                              )}
                              {tool.locationCounts.repair && (
                                <span className="mr-3">
                                  🔧 修理中: {tool.locationCounts.repair}
                                </span>
                              )}
                              {tool.locationCounts.lost && (
                                <span className="mr-3 text-red-500">
                                  ❌ 紛失: {tool.locationCounts.lost}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              {tool.statusCounts.available > 0 && (
                                <div className="text-xs text-green-600">
                                  利用可能: {tool.statusCounts.available}
                                </div>
                              )}
                              {tool.statusCounts.in_use > 0 && (
                                <div className="text-xs text-blue-600">
                                  使用中: {tool.statusCounts.in_use}
                                </div>
                              )}
                              {tool.statusCounts.maintenance > 0 && (
                                <div className="text-xs text-yellow-600">
                                  メンテ: {tool.statusCounts.maintenance}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  登録されている道具がありません
                </p>
                <Link
                  href="/tools/new"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  最初の道具を登録する
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
