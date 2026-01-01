import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'

export default async function ToolSetMovementPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報取得

  // 道具セット一覧を取得
  const { data: toolSets, error } = await supabase
    .from('tool_sets')
    .select('id, name, description, current_location, current_site_id, status')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">道具セット移動</h1>
          <p className="mt-2 text-sm text-gray-600">
            登録済みの道具セットの現在地を変更します
          </p>
        </div>

        {!toolSets || toolSets.length === 0 ? (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                道具セットが登録されていません
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                道具セットを移動するには、まず道具セットを登録してください。
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <Link
                  href="/tool-sets/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  道具セットを登録
                </Link>
                <Link
                  href="/tool-sets"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  道具セット一覧へ
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="space-y-4">
                <h2 className="text-lg font-medium text-gray-900">登録済み道具セット</h2>
                <ul className="divide-y divide-gray-200">
                  {toolSets?.map((toolSet: any) => (
                      <li key={toolSet.id} className="py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {toolSet.name}
                            </p>
                            {toolSet.description && (
                              <p className="text-sm text-gray-500 truncate">
                                {toolSet.description}
                              </p>
                            )}
                            <div className="mt-1 flex items-center space-x-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  toolSet.status === 'available'
                                    ? 'bg-green-100 text-green-800'
                                    : toolSet.status === 'in_use'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {toolSet.status === 'available'
                                  ? '利用可能'
                                  : toolSet.status === 'in_use'
                                  ? '使用中'
                                  : 'メンテナンス中'}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <Link
                              href={`/tool-sets/${toolSet.id}`}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                              詳細
                            </Link>
                          </div>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
