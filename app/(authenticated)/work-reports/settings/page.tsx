import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { WorkReportSettingsForm } from './WorkReportSettingsForm'
import { CustomFieldsManager } from './CustomFieldsManager'

export default async function WorkReportSettingsPage() {

  const { userId, organizationId, userRole, supabase } = await requireAuth()

    // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', userId)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 管理者権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // カスタムフィールド取得
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
          <h1 className="text-2xl font-bold text-gray-900">作業報告書 設定</h1>
          <p className="mt-1 text-sm text-gray-600">
            組織全体の作業報告書の設定を管理します。
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <WorkReportSettingsForm />
          </div>

          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <CustomFieldsManager initialFields={customFields || []} />
          </div>
        </div>
      </div>
    </div>
  )
}
