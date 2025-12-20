import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WorkReportForm } from './WorkReportForm'

export default async function NewWorkReportPage() {
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
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 組織内の道具一覧を取得（使用道具選択用）
  const { data: organizationTools } = await supabase
    .from('tools')
    .select('id, name, model_number')
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('name')

  // 組織の報告書設定を取得
  const { data: settings } = await supabase
    .from('organization_report_settings')
    .select('*')
    .eq('organization_id', userData?.organization_id)
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

  // カスタムフィールド定義を取得（組織全体 + 現場固有は後で取得）
  const { data: customFields } = await supabase
    .from('work_report_custom_fields')
    .select('*')
    .eq('organization_id', userData?.organization_id)
    .is('site_id', null)
    .order('display_order', { ascending: true })

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">作業報告書 新規作成</h1>
          <p className="mt-1 text-sm text-gray-600">
            作業報告書を作成します。必須項目を入力してください。
          </p>
        </div>

        <WorkReportForm
          sites={sites || []}
          organizationUsers={organizationUsers || []}
          organizationTools={organizationTools || []}
          currentUserId={user.id}
          currentUserName={userData.name}
          settings={reportSettings}
          customFields={customFields || []}
        />
      </div>
    </div>
  )
}
