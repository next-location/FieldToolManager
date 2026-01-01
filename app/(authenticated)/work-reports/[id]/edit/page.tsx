import { requireAuth } from '@/lib/auth/page-auth'
import { redirect, notFound } from 'next/navigation'
import { WorkReportEditForm } from './WorkReportEditForm'

export default async function EditWorkReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // ユーザー名取得
  const { data: userData } = await supabase
    .from('users')
    .select('name')
    .eq('id', userId)
    .single()

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

  // デバッグ: 取得したデータを確認
  console.log('=== Edit Page Report Data ===')
  console.log('weather:', report.weather)
  console.log('workers:', report.workers)
  console.log('materials_used:', report.materials_used)
  console.log('tools_used:', report.tools_used)
  console.log('special_notes:', report.special_notes)
  console.log('remarks:', report.remarks)
  console.log('custom_fields_data:', report.custom_fields_data)

  // 編集権限チェック（下書き または 却下された報告書 かつ 作成者のみ）
  if (
    (report.status !== 'draft' && report.status !== 'rejected') ||
    report.created_by !== userId
  ) {
    redirect(`/work-reports/${id}`)
  }

  // アクティブな現場一覧を取得
  const { data: sites } = await supabase
    .from('sites')
    .select('id, name, address')
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('name')

  // 組織内のユーザー一覧を取得（帯同作業員選択用）
  const { data: organizationUsers } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // 組織内の道具一覧を取得（使用道具選択用）
  const { data: organizationTools } = await supabase
    .from('tools')
    .select('id, name, model_number')
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('name')

  // 組織の報告書設定を取得
  const { data: settings } = await supabase
    .from('organization_report_settings')
    .select('*')
    .eq('organization_id', organizationId)
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

  // カスタムフィールド定義を取得
  const { data: customFields } = await supabase
    .from('work_report_custom_fields')
    .select('*')
    .eq('organization_id', organizationId)
    .is('site_id', null)
    .order('display_order', { ascending: true })

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
          organizationUsers={organizationUsers || []}
          organizationTools={organizationTools || []}
          currentUserId={userId}
          currentUserName={userData?.name || ''}
          settings={reportSettings}
          customFields={customFields || []}
        />
      </div>
    </div>
  )
}
