import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkReportEditForm } from './WorkReportEditForm'

export default async function EditWorkReportPage({
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
    .select('organization_id, role, name')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 作業報告書を取得
  const { data: report, error } = await supabase
    .from('work_reports')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !report) {
    notFound()
  }

  // 編集権限チェック（下書き状態 かつ 作成者のみ）
  if (report.status !== 'draft' || report.created_by !== user.id) {
    redirect(`/work-reports/${id}`)
  }

  // アクティブな現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, address')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 組織のアクティブなユーザー（作業員）を取得
  const { data: workers } = await supabase
    .from('users')
    .select('id, name, role')
    .eq('organization_id', userData.organization_id)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 組織の報告書設定を取得
  const { data: settings } = await supabase
    .from('organization_report_settings')
    .select('*')
    .eq('organization_id', userData.organization_id)
    .single()

  // 設定がない場合はデフォルト値
  const reportSettings = settings || {
    enable_work_location: true,
    enable_progress_rate: true,
    enable_materials: true,
    enable_tools: true,
    custom_fields: [],
    require_approval: false,
  }

  return (
    <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">作業報告書 編集</h1>
          <p className="mt-1 text-sm text-gray-600">
            作業報告書を編集します。必須項目を入力してください。
          </p>
        </div>

        <WorkReportEditForm
          report={report}
          sites={sites || []}
          workers={workers || []}
          settings={reportSettings}
        />
      </div>
    </div>
  )
}
