import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function MovementsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 移動履歴を取得
  const { data: movements, error } = await supabase
    .from('tool_movements')
    .select(
      `
      *,
      tool:tools (id, name, model_number),
      tool_item:tool_items (
        id,
        serial_number,
        tools (name, model_number)
      ),
      from_site:sites!tool_movements_from_site_id_fkey (name),
      to_site:sites!tool_movements_to_site_id_fkey (name),
      user:users!tool_movements_performed_by_fkey (name)
    `
    )
    .order('created_at', { ascending: false })
    .limit(100)

  const movementTypeLabels: Record<string, string> = {
    check_out: '🔵 持ち出し',
    check_in: '🟢 返却',
    transfer: '🔄 移動',
    repair: '🔧 修理',
    return_from_repair: '✅ 修理完了',
    lost: '🚨 紛失報告',
    disposed: '🗑️ 廃棄',
    maintenance: '🔧 メンテナンス',
    correction: '🔄 位置修正',
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">道具移動履歴</h1>
            <Link
              href="/movements/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + 移動を登録
            </Link>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              エラーが発生しました: {error.message}
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      日時
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      種別
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      道具
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      移動元
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      移動先
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      実施者
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {movements && movements.length > 0 ? (
                    movements.map((movement: any) => (
                      <tr key={movement.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(movement.created_at).toLocaleString('ja-JP')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {movementTypeLabels[movement.movement_type] || movement.movement_type}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {movement.tool_item ? (
                            <Link
                              href={`/tool-items/${movement.tool_item.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {(movement.tool_item.tools as any).name} #{movement.tool_item.serial_number}
                            </Link>
                          ) : movement.tool ? (
                            <Link
                              href={`/tools/${movement.tool.id}`}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              {movement.tool.name}
                            </Link>
                          ) : (
                            <span className="text-gray-500">削除済み</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.from_site?.name || movement.from_location === 'warehouse' ? '倉庫' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {movement.to_site?.name || movement.to_location === 'warehouse' ? '倉庫' : movement.to_location === 'repair' ? '修理中' : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {movement.user?.name || '不明'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        移動履歴がありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
        </div>
      </div>
    </div>
  )
}
