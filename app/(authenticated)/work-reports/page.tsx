import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { WorkReportFilter } from './WorkReportFilter'
import { getOrganizationFeatures, hasPackage } from '@/lib/features/server'
import { PackageRequired } from '@/components/PackageRequired'

export default async function WorkReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string
    site_id?: string
    date_from?: string
    date_to?: string
    keyword?: string
    created_by?: string
  }>
}) {
  const params = await searchParams
  const status = params.status || 'all'
  const siteId = params.site_id || ''
  const dateFrom = params.date_from || ''
  const dateTo = params.date_to || ''
  const keyword = params.keyword || ''
  const createdBy = params.created_by || ''

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
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // パッケージチェック
  if (userData?.organization_id) {
    const features = await getOrganizationFeatures(userData?.organization_id)
    if (!hasPackage(features, 'dx')) {
      return <PackageRequired packageType="dx" featureName="作業報告書" userRole={userData.role} />
    }
  }

  // 作業報告書を取得
  let query = supabase
    .from('work_reports')
    .select(
      `
      *,
      site:sites!work_reports_site_id_fkey (
        id,
        name,
        address
      ),
      created_by_user:users!work_reports_created_by_fkey (
        id,
        name
      )
    `
    )
    .is('deleted_at', null)

  // ステータスフィルター
  if (status !== 'all') {
    query = query.eq('status', status)
  }

  // 現場フィルター
  if (siteId) {
    query = query.eq('site_id', siteId)
  }

  // 作成者フィルター
  if (createdBy) {
    query = query.eq('created_by', createdBy)
  }

  // 日付範囲フィルター
  if (dateFrom) {
    query = query.gte('report_date', dateFrom)
  }
  if (dateTo) {
    query = query.lte('report_date', dateTo)
  }

  const { data: reports, error } = await query.order('created_at', {
    ascending: false,
  })

  // キーワード検索（クライアント側フィルタリング）
  let filteredReports = reports || []
  if (keyword) {
    const lowerKeyword = keyword.toLowerCase()
    filteredReports = filteredReports.filter((report) => {
      const descriptionMatch = report.description.toLowerCase().includes(lowerKeyword)
      const locationMatch = report.work_location && report.work_location.toLowerCase().includes(lowerKeyword)
      return descriptionMatch || locationMatch
    })
  }

  // 現場一覧を取得（フィルタ用）
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 作成者一覧を取得（フィルタ用）
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', userData?.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 天気アイコン
  const weatherIcons: Record<string, string> = {
    sunny: '☀️',
    cloudy: '☁️',
    rainy: '🌧️',
    snowy: '⛄',
    '': '－',
  }

  // ステータスバッジのスタイル
  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '下書き' },
      submitted: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '提出済' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', label: '承認済' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', label: '差戻' },
    }
    return badges[status] || badges.draft
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">作業報告書</h1>
          </div>
          <Link
            href="/work-reports/new"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            + 新規作成
          </Link>
        </div>

        <WorkReportFilter sites={sites || []} users={users || []} />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded mb-4">
            エラーが発生しました: {error.message}
          </div>
        )}

        {/* 検索結果件数表示 */}
        {(keyword || siteId || dateFrom || dateTo || status !== 'all') && (
          <div className="mb-4 text-sm text-gray-600">
            <span className="font-medium">{filteredReports.length}</span> 件の報告書が見つかりました
          </div>
        )}

        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredReports && filteredReports.length > 0 ? (
              filteredReports.map((report) => {
                const badge = getStatusBadge(report.status)
                return (
                  <li key={report.id}>
                    <Link
                      href={`/work-reports/${report.id}`}
                      className="block hover:bg-gray-50 transition-colors"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <p className="text-sm font-medium text-blue-600">
                                {new Date(report.report_date).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                              <span className="text-lg">
                                {weatherIcons[report.weather as keyof typeof weatherIcons] || '－'}
                              </span>
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${badge.bg} ${badge.text}`}
                              >
                                {badge.label}
                              </span>
                            </div>

                            {report.site && (
                              <p className="mt-1 text-sm text-gray-900 font-medium">
                                📍 {report.site.name}
                              </p>
                            )}

                            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                              {report.description}
                            </p>

                            {report.work_location && (
                              <p className="mt-1 text-sm text-gray-500">
                                🔧 作業場所: {report.work_location}
                              </p>
                            )}

                            {report.progress_rate !== null && report.progress_rate !== undefined && (
                              <p className="mt-1 text-sm text-gray-500">
                                進捗: {report.progress_rate}%
                              </p>
                            )}

                            <div className="flex items-center gap-4 mt-2">
                              {report.created_by_user && (
                                <p className="text-xs text-gray-500">
                                  👤 {report.created_by_user.name}
                                </p>
                              )}
                              {report.workers && Array.isArray(report.workers) && report.workers.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  👷 作業員: {report.workers.length}名
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <svg
                              className="w-5 h-5 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                )
              })
            ) : (
              <li className="px-4 py-12 text-center text-gray-500">
                {keyword || siteId || dateFrom || dateTo || status !== 'all' ? (
                  <>
                    検索条件に一致する作業報告書がありません
                    <br />
                    <span className="text-sm">
                      検索条件を変更してお試しください
                    </span>
                  </>
                ) : (
                  <>
                    作業報告書がまだ登録されていません
                    <br />
                    <span className="text-sm">
                      「+ 新規作成」ボタンから作業報告書を作成してください
                    </span>
                  </>
                )}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
