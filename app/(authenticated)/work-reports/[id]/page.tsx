import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DeleteButton } from './DeleteButton'
import { DownloadPDFButton } from './DownloadPDFButton'
import { PhotoGallery } from './PhotoGallery'

export default async function WorkReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // 作業報告書を取得
  const { data: report, error } = await supabase
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
        name,
        email
      )
    `
    )
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !report) {
    notFound()
  }

  // 編集・削除権限チェック
  const canEdit = report.status === 'draft' && report.created_by === user.id
  const canDelete = report.created_by === user.id || userData.role === 'admin'

  // 天気アイコン
  const weatherIcons: Record<string, string> = {
    sunny: '☀️ 晴れ',
    cloudy: '☁️ 曇り',
    rainy: '🌧️ 雨',
    snowy: '⛄ 雪',
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

  const badge = getStatusBadge(report.status)

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Link
                href="/work-reports"
                className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
              >
                ← 作業報告書一覧に戻る
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">作業報告書 詳細</h1>
            </div>

            <div className="flex gap-2">
              <DownloadPDFButton report={report} />
              {canEdit && (
                <Link
                  href={`/work-reports/${id}/edit`}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  編集
                </Link>
              )}
              {canDelete && <DeleteButton reportId={id} />}
            </div>
          </div>
        </div>

        {/* 基本情報 */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {new Date(report.report_date).toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'short',
                })}
              </h2>
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
            </div>

            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">現場</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {report.site ? (
                    <>
                      <Link href={`/sites/${report.site.id}`} className="text-blue-600 hover:text-blue-800">
                        {report.site.name}
                      </Link>
                      {report.site.address && (
                        <div className="text-gray-600 mt-1">📍 {report.site.address}</div>
                      )}
                    </>
                  ) : (
                    '－'
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">天気</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {weatherIcons[report.weather as keyof typeof weatherIcons] || '－'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">作成者</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {report.created_by_user ? report.created_by_user.name : '－'}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-500">作成日時</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(report.created_at).toLocaleString('ja-JP')}
                </dd>
              </div>

              {report.work_location && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">作業場所（詳細）</dt>
                  <dd className="mt-1 text-sm text-gray-900">{report.work_location}</dd>
                </div>
              )}

              {report.progress_rate !== null && report.progress_rate !== undefined && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">進捗率</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${report.progress_rate}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold">{report.progress_rate}%</span>
                    </div>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* 作業員 */}
        {report.workers && Array.isArray(report.workers) && report.workers.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">作業員</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.workers.map((worker: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <div className="font-medium text-gray-900">👷 {worker.name}</div>
                    </div>
                    {worker.work_hours !== undefined && (
                      <div className="text-sm text-gray-600">
                        {worker.work_hours}時間
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 作業内容 */}
        <div className="bg-white shadow sm:rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">作業内容</h3>
            <div className="prose max-w-none">
              <p className="text-gray-900 whitespace-pre-wrap">{report.description}</p>
            </div>
          </div>
        </div>

        {/* 使用した資材 */}
        {report.materials_used && Array.isArray(report.materials_used) && report.materials_used.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">使用した資材</h3>
              <ul className="list-disc list-inside space-y-1">
                {report.materials_used.map((material, index) => (
                  <li key={index} className="text-gray-900">{material}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* 写真ギャラリー */}
        <PhotoGallery reportId={id} canEdit={canEdit} />

        {/* メタ情報 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">作成日時</dt>
              <dd className="text-gray-900">{new Date(report.created_at).toLocaleString('ja-JP')}</dd>
            </div>
            <div>
              <dt className="text-gray-500">最終更新日時</dt>
              <dd className="text-gray-900">{new Date(report.updated_at).toLocaleString('ja-JP')}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
