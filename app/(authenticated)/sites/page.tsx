import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { SiteFilter } from './SiteFilter'

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const status = params.status || 'active'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // フィルター条件に応じてクエリを構築
  let query = supabase
    .from('sites')
    .select(
      `
      *,
      manager:users!sites_manager_id_fkey (
        name,
        email
      )
    `
    )
    .is('deleted_at', null)

  // ステータスフィルター
  if (status === 'active') {
    query = query.eq('is_active', true)
  } else if (status === 'completed') {
    query = query.eq('is_active', false).not('completed_at', 'is', null)
  }

  const { data: sites, error } = await query.order('created_at', { ascending: false })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">現場管理</h1>
            <Link
              href="/sites/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + 新規登録
            </Link>
          </div>

          <SiteFilter />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
              エラーが発生しました: {error.message}
            </div>
          )}

          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
              {sites && sites.length > 0 ? (
                sites.map((site) => (
                  <li key={site.id}>
                    <Link
                      href={`/sites/${site.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-600 truncate">
                              {site.name}
                            </p>
                            {site.address && (
                              <p className="mt-1 text-sm text-gray-500">
                                📍 {site.address}
                              </p>
                            )}
                            {site.manager && (
                              <p className="mt-1 text-sm text-gray-500">
                                👤 担当: {site.manager.name}
                              </p>
                            )}
                            {site.completed_at && (
                              <p className="mt-1 text-sm text-gray-500">
                                ✅ 完了日: {new Date(site.completed_at).toLocaleDateString('ja-JP')}
                              </p>
                            )}
                          </div>
                          <div className="ml-4">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                site.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : site.completed_at
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {site.is_active ? '稼働中' : site.completed_at ? '完了' : '停止中'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-12 text-center text-gray-500">
                  {status === 'active' && '稼働中の現場がありません'}
                  {status === 'completed' && '完了した現場がありません'}
                  {status === 'all' && '現場が登録されていません'}
                </li>
              )}
            </ul>
        </div>
      </div>
    </div>
  )
}
