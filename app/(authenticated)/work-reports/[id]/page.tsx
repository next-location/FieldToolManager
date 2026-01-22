import { requireAuth } from '@/lib/auth/page-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteButton } from './DeleteButton'
import { DownloadPDFButton } from './DownloadPDFButton'
import { ApprovalButtons } from './ApprovalButtons'
import { ApprovalHistory } from './ApprovalHistory'
import { SubmitButton } from './SubmitButton'
import { StatusBadge } from '@/components/work-reports/StatusBadge'
import { PhotoGallery } from './PhotoGallery'
import { AttachmentList } from './AttachmentList'

export default async function WorkReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  const {
  } = await supabase.auth.getUser()



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

  // 使用した道具の情報を取得
  let toolsData: any[] = []
  if (report.tools_used && Array.isArray(report.tools_used) && report.tools_used.length > 0) {
    const { data: tools } = await supabase
      .from('tools')
      .select('id, name, model_number')
      .in('id', report.tools_used)
      .is('deleted_at', null)

    if (tools) {
      toolsData = tools
    }
  }

  // 組織の作業報告書設定を取得（カスタムフィールド定義のため）
  const { data: orgSettings } = await supabase
    .from('organization_report_settings')
    .select('custom_fields')
    .eq('organization_id', organizationId)
    .single()

  // カスタムフィールドのキーと表示名のマップを作成
  const customFieldLabels: Record<string, string> = {
    temperature: '気温',
    safety_check: '安全確認'
  }

  // 組織設定から追加のカスタムフィールド定義を取得
  if (orgSettings?.custom_fields) {
    orgSettings.custom_fields.forEach((field: any) => {
      if (field.key) {
        customFieldLabels[field.key] = field.name || field.key
      }
    })
  }

  // 承認履歴を取得
  let approvalsData: any[] = []
  if (report.status === 'approved' || report.status === 'rejected') {
    const { data: approvals } = await supabase
      .from('work_report_approvals')
      .select('id, approver_name, action, comment, approved_at')
      .eq('work_report_id', id)
      .eq('organization_id', organizationId)
      .order('approved_at', { ascending: false })

    if (approvals) {
      approvalsData = approvals
    }
  }

  // 編集・削除権限チェック
  // 下書き または 却下された報告書は作成者が編集可能
  const canEdit =
    (report.status === 'draft' || report.status === 'rejected') && report.created_by === userId
  const canDelete = report.created_by === userId || userRole === 'admin'
  const canResubmit = report.status === 'rejected' && report.created_by === userId

  // 承認権限チェック（manager/admin かつ 提出済みステータス）
  const canApprove =
    (userRole === 'manager' || userRole === 'admin') && report.status === 'submitted'

  // 天気アイコン
  const weatherIcons: Record<string, string> = {
    sunny: '☀️ 晴れ',
    cloudy: '☁️ 曇り',
    rainy: '🌧️ 雨',
    snowy: '⛄ 雪',
    '': '－',
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        {/* ヘッダー */}
        <div className="mb-6">
          <Link
            href="/work-reports"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← 作業報告書一覧に戻る
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">作業報告書 詳細</h1>

            <div className="flex flex-wrap gap-2">
              <DownloadPDFButton
                reportId={id}
                siteName={report.site?.name || '不明'}
                reportDate={report.report_date}
              />
              <SubmitButton reportId={id} status={report.status} />
              {canApprove && <ApprovalButtons reportId={id} status={report.status} />}
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
              <StatusBadge status={report.status as 'draft' | 'submitted' | 'approved' | 'rejected'} />
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

        {/* 作業時間 */}
        {(report.work_start_time || report.work_end_time || report.break_minutes !== null) && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">作業時間</h3>
              <dl className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                {report.work_start_time && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">開始時刻</dt>
                    <dd className="mt-1 text-sm text-gray-900">{report.work_start_time}</dd>
                  </div>
                )}
                {report.work_end_time && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">終了時刻</dt>
                    <dd className="mt-1 text-sm text-gray-900">{report.work_end_time}</dd>
                  </div>
                )}
                {report.break_minutes !== null && report.break_minutes !== undefined && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">休憩時間</dt>
                    <dd className="mt-1 text-sm text-gray-900">{report.break_minutes}分</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        )}

        {/* 作業員 */}
        {report.workers && Array.isArray(report.workers) && report.workers.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">作業員</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {report.workers.map((worker: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-gray-900">👷 {worker.name}</div>
                      {worker.work_hours !== undefined && (
                        <div className="text-sm text-gray-600">
                          実働: {worker.work_hours}時間
                        </div>
                      )}
                    </div>
                    {worker.overtime_hours !== undefined && worker.overtime_hours > 0 && (
                      <div className="text-sm text-gray-600">
                        残業: {worker.overtime_hours}時間
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

        {/* 使用資材 */}
        {report.materials_used && Array.isArray(report.materials_used) && report.materials_used.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">使用資材</h3>
              <div className="prose max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap">{report.materials_used.join('\n')}</p>
              </div>
            </div>
          </div>
        )}

        {/* 使用道具（道具マスタから選択） */}
        {toolsData.length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">使用道具</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {toolsData.map((tool) => (
                  <div key={tool.id} className="p-3 bg-gray-50 rounded-md">
                    <div className="font-medium text-gray-900">🔧 {tool.name}</div>
                    {tool.model_number && (
                      <div className="text-sm text-gray-600 mt-1">型番: {tool.model_number}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 特記事項 */}
        {report.special_notes && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">特記事項</h3>
              <div className="prose max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap">{report.special_notes}</p>
              </div>
            </div>
          </div>
        )}

        {/* 備考 */}
        {report.remarks && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">備考</h3>
              <div className="prose max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap">{report.remarks}</p>
              </div>
            </div>
          </div>
        )}

        {/* カスタムフィールド（新形式） */}
        {report.custom_fields_data && Object.keys(report.custom_fields_data).length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">カスタム項目</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {Object.entries(report.custom_fields_data).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{customFieldLabels[key] || key}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {Array.isArray(value)
                        ? value.join('、')
                        : typeof value === 'boolean'
                        ? (value ? 'はい' : 'いいえ')
                        : value?.toString() || '－'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* カスタムフィールド（旧形式 - 新形式がない場合のみ表示） */}
        {!report.custom_fields_data && report.custom_fields && Object.keys(report.custom_fields).length > 0 && (
          <div className="bg-white shadow sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">カスタム項目</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {Object.entries(report.custom_fields).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-gray-500">{key}</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {typeof value === 'boolean' ? (value ? 'はい' : 'いいえ') : value?.toString() || '－'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        {/* 写真 */}
        <PhotoGallery reportId={id} canEdit={false} />

        {/* 添付資料 */}
        <AttachmentList reportId={id} canEdit={false} />

        {/* 承認履歴 */}
        {(report.status === 'approved' || report.status === 'rejected') && approvalsData.length > 0 && (
          <ApprovalHistory approvals={approvalsData} />
        )}

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
