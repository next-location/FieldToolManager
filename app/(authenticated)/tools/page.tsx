import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import ToolsList from '@/components/tools/ToolsList'

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
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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

        <ToolsList initialTools={toolsWithItems || []} />
      </div>
    </div>
  )
}
